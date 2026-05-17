const prisma = require('../config/db');
const { redisPublisher } = require('../config/redisPubSub');

class WorkshopService {
  /**
   * Get list of workshops with details, room and speakers
   * @param {object} params - query params (limit, offset, status)
   */
  static async listWorkshops(params = {}) {
    const { limit = 1000, offset = 0, status } = params;
    const now = new Date();

    // Create where clause dynamically
    const where = {};

    // Defensive check: ignore status if it's null, undefined, 'all', or strings of null/undefined
    const invalidStatuses = ['all', 'null', 'undefined'];
    if (status && !invalidStatuses.includes(String(status).toLowerCase())) {
      where.status = status;
    }

    const [total, ongoingCount, workshops] = await Promise.all([
      prisma.workshop.count({ where }),
      prisma.workshop.count({
        where: {
          ...where,
          start_time: { lte: now },
          end_time: { gte: now }
        }
      }),
      prisma.workshop.findMany({
        where,
        include: {
          room: true,
          workshop_speakers: {
            include: {
              speaker: true
            }
          },
          _count: {
            select: {
              registrations: true
            }
          },
          // We can't easily count "registrations with checkin" via _count select
          // so we'll fetch the registrations with their checkin status
          registrations: {
            select: {
              id: true,
              status: true,
              checkin: { select: { id: true } }
            }
          }
        },
        orderBy: { event_day: 'asc' },
        take: parseInt(limit),
        skip: parseInt(offset),
      })
    ]);

    // Flatten speakers and calculate counts
    const formattedWorkshops = workshops.map(ws => {
      // "Occupied" means any registration that isn't cancelled
      const occupiedRegs = ws.registrations.filter(r =>
        ['confirmed', 'pending_payment', 'attended'].includes(r.status)
      );
      const checkinCount = ws.registrations.filter(r => r.checkin).length;

      const { registrations, ...wsData } = ws;

      return {
        ...wsData,
        id: ws.id.toString(),
        room_id: ws.room_id.toString(),
        created_by: ws.created_by.toString(),
        price: ws.price ? parseFloat(ws.price.toString()) : null,
        capacity: ws.capacity,
        registration_count: occupiedRegs.length,
        checkin_count: checkinCount,
        available_seats: ws.capacity - occupiedRegs.length,
        speakers: ws.workshop_speakers.map(wsSpeaker => ({
          ...wsSpeaker.speaker,
          id: wsSpeaker.speaker.id.toString(),
          is_main: wsSpeaker.is_main_speaker
        }))
      };
    });

    return {
      total,
      ongoingCount,
      limit: parseInt(limit),
      offset: parseInt(offset),
      data: formattedWorkshops
    };
  }

  /**
   * Get single workshop by ID
   * @param {string} id 
   */
  static async getWorkshopById(id) {
    const workshop = await prisma.workshop.findUnique({
      where: { id: BigInt(id) },
      include: {
        room: true,
        workshop_speakers: {
          include: {
            speaker: true
          }
        },
        ai_summaries: {
          where: { status: 'completed' },
          select: { summary_text: true, completed_at: true },
          orderBy: { completed_at: 'desc' },
          take: 1,
        },
      }
    });

    if (!workshop) return null;

    return {
      ...workshop,
      id: workshop.id.toString(),
      room_id: workshop.room_id.toString(),
      created_by: workshop.created_by.toString(),
      price: workshop.price ? parseFloat(workshop.price.toString()) : null,
      speakers: workshop.workshop_speakers.map(wsSpeaker => ({
        ...wsSpeaker.speaker,
        id: wsSpeaker.speaker.id.toString(),
        is_main: wsSpeaker.is_main_speaker
      }))
    };
  }

  /**
   * Create a new workshop
   */
  static async createWorkshop(data, userId) {
    const { title, speaker, startTime, endTime, roomId, totalSeats, pricing, pdfJobId } = data;
    
    // Find room by room_code to get its ID
    const room = await prisma.room.findUnique({ where: { room_code: roomId } });
    if (!room) {
      throw new Error(`Room with code ${roomId} not found`);
    }

    const result = await prisma.$transaction(async (tx) => {
      // Create the workshop
      const newWorkshop = await tx.workshop.create({
        data: {
          title,
          description: '', // Can be updated later
          event_day: new Date(startTime),
          start_time: new Date(startTime),
          end_time: new Date(endTime),
          room_id: room.id,
          capacity: totalSeats,
          available_seats: totalSeats,
          price: pricing.isFree ? null : pricing.amount,
          status: 'published',
          created_by: BigInt(userId),
        }
      });

      // Handle Speaker (simplistic: create or find speaker, link to workshop)
      if (speaker) {
        let speakerRecord = await tx.speaker.findFirst({ where: { full_name: speaker } });
        if (!speakerRecord) {
          speakerRecord = await tx.speaker.create({
            data: { full_name: speaker }
          });
        }
        
        await tx.workshopSpeaker.create({
          data: {
            workshop_id: newWorkshop.id,
            speaker_id: speakerRecord.id,
            is_main_speaker: true
          }
        });
      }

      // If there was an AI PDF job, link the results
      if (pdfJobId) {
        // We need AiSummaryService to get job status
        const AiSummaryService = require('./aiSummary.service');
        const jobData = await AiSummaryService.getJobStatus(pdfJobId);
        
        if (jobData && jobData.status === 'completed') {
           // We might not have the original file name easily, use a placeholder
           const doc = await tx.workshopDocument.create({
             data: {
               workshop_id: newWorkshop.id,
               original_file_name: 'uploaded_document.pdf',
               storage_path: 'local_storage', // in a real app, this would be the actual path
               mime_type: 'application/pdf',
               uploaded_by: BigInt(userId),
               upload_status: 'uploaded'
             }
           });

           await tx.aiSummary.create({
             data: {
               workshop_id: newWorkshop.id,
               document_id: doc.id,
               status: 'completed',
               ai_model: 'gemini-1.5-flash',
               raw_text: jobData.raw_text || '',
               summary_text: jobData.summary_text || '',
               suggested_title: jobData.suggested_title || '',
               speaker_name: jobData.speaker_name || '',
               completed_at: new Date()
             }
           });
        }
      }

      return newWorkshop;
    });

    return result;
  }

  /**
   * Processes a workshop registration (called by worker)
   * @param {string|number} userId 
   * @param {string|number} workshopId 
   */
  static async processRegistration(userId, workshopId) {
    const userIdBig = BigInt(userId);
    const workshopIdBig = BigInt(workshopId);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Check available_seats
      const workshop = await tx.workshop.findUnique({
        where: { id: workshopIdBig },
        select: { id: true, available_seats: true, capacity: true }
      });

      if (!workshop) {
        throw new Error(`Workshop ${workshopId} not found`);
      }

      // 2. Find Student
      const student = await tx.student.findUnique({
        where: { user_id: userIdBig },
        select: { id: true }
      });

      if (!student) {
        throw new Error(`Student record not found for user ${userId}`);
      }

      // 3. Check existing registration
      const existingRegistration = await tx.registration.findUnique({
        where: {
          student_id_workshop_id: {
            student_id: student.id,
            workshop_id: workshop.id,
          }
        }
      });

      if (existingRegistration) {
        throw new Error(`User ${userId} already registered for workshop ${workshopId}`);
      }

      if (workshop.available_seats > 0) {
        const updatedWorkshop = await tx.workshop.update({
          where: { id: workshopIdBig },
          data: { available_seats: { decrement: 1 } },
          select: { available_seats: true },
        });

        await tx.registration.create({
          data: {
            student_id: student.id,
            workshop_id: workshop.id,
            status: 'pending_payment'
          }
        });

        return {
          success: true,
          message: `Successfully registered user ${userId} for workshop ${workshopId}`,
          _seatBroadcast: { workshopId: Number(workshopIdBig), availableSeats: updatedWorkshop.available_seats },
        };
      }

      return {
        success: false,
        message: `Workshop ${workshopId} is sold out. Skipping registration for user ${userId}.`
      };
    });

    const { _seatBroadcast, ...publicResult } = result;

    if (_seatBroadcast) {
      try {
        await redisPublisher.publish('seat_updates', JSON.stringify(_seatBroadcast));
      } catch (err) {
        console.error('[Redis Pub] Failed to broadcast seat_updates — registration unaffected:', err);
      }
    }

    return publicResult;
  }

  /**
   * Update an existing workshop
   */
  static async updateWorkshop(id, data, userId) {
    const { title, speaker, startTime, endTime, roomId, totalSeats, pricing, pdfJobId } = data;
    const workshopIdBig = BigInt(id);

    // Check if workshop exists
    const existing = await prisma.workshop.findUnique({ where: { id: workshopIdBig } });
    if (!existing) {
      const err = new Error(`Workshop with ID ${id} not found`);
      err.statusCode = 404;
      throw err;
    }
    
    // Find room by room_code to get its ID
    const room = await prisma.room.findUnique({ where: { room_code: roomId } });
    if (!room) {
      throw new Error(`Room with code ${roomId} not found`);
    }

    const result = await prisma.$transaction(async (tx) => {
      // Calculate available seats accurately based on current registrations
      const activeRegCount = await tx.registration.count({
        where: {
          workshop_id: workshopIdBig,
          status: { in: ['confirmed', 'pending_payment', 'reserved', 'waitlisted'] }
        }
      });
      const availableSeats = Math.max(0, totalSeats - activeRegCount);

      // Update the workshop
      const updatedWorkshop = await tx.workshop.update({
        where: { id: workshopIdBig },
        data: {
          title,
          event_day: new Date(startTime),
          start_time: new Date(startTime),
          end_time: new Date(endTime),
          room_id: room.id,
          capacity: totalSeats,
          available_seats: availableSeats,
          price: pricing.isFree ? null : pricing.amount,
        }
      });

      // Handle Speaker (delete existing mapping and set new)
      if (speaker) {
        await tx.workshopSpeaker.deleteMany({
          where: { workshop_id: workshopIdBig }
        });

        let speakerRecord = await tx.speaker.findFirst({ where: { full_name: speaker } });
        if (!speakerRecord) {
          speakerRecord = await tx.speaker.create({
            data: { full_name: speaker }
          });
        }
        
        await tx.workshopSpeaker.create({
          data: {
            workshop_id: workshopIdBig,
            speaker_id: speakerRecord.id,
            is_main_speaker: true
          }
        });
      }

      // If there was an AI PDF job, link the results
      if (pdfJobId) {
        const AiSummaryService = require('./aiSummary.service');
        const jobData = await AiSummaryService.getJobStatus(pdfJobId);
        
        if (jobData && jobData.status === 'completed') {
           const doc = await tx.workshopDocument.create({
             data: {
               workshop_id: workshopIdBig,
               original_file_name: 'uploaded_document.pdf',
               storage_path: 'local_storage',
               mime_type: 'application/pdf',
               uploaded_by: BigInt(userId),
               upload_status: 'uploaded'
             }
           });

           await tx.aiSummary.create({
             data: {
               workshop_id: workshopIdBig,
               document_id: doc.id,
               status: 'completed',
               ai_model: 'gemini-1.5-flash',
               raw_text: jobData.raw_text || '',
               summary_text: jobData.summary_text || '',
               suggested_title: jobData.suggested_title || '',
               speaker_name: jobData.speaker_name || '',
               completed_at: new Date()
             }
           });
        }
      }

      return updatedWorkshop;
    });

    return result;
  }

  /**
   * Cancel (soft-delete) an existing workshop
   */
  static async cancelWorkshop(id) {
    const workshopIdBig = BigInt(id);
    
    // Check if workshop exists
    const existing = await prisma.workshop.findUnique({ where: { id: workshopIdBig } });
    if (!existing) {
      const err = new Error(`Workshop with ID ${id} not found`);
      err.statusCode = 404;
      throw err;
    }

    const updated = await prisma.workshop.update({
      where: { id: workshopIdBig },
      data: { status: 'cancelled' }
    });

    return updated;
  }
}

module.exports = WorkshopService;
