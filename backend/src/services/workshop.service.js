const prisma = require('../config/db');
const { getChannel } = require('../config/rabbitmq');

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
        }
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
   * Adds a document to a workshop and triggers AI summary processing
   * @param {object} data - { workshopId, fileName, storagePath, fileSize, userId }
   */
  static async addDocumentAndTriggerSummary(data) {
    const { workshopId, fileName, storagePath, fileSize, userId } = data;
    const wsIdBig = BigInt(workshopId);
    const userIdBig = BigInt(userId);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create WorkshopDocument
      const doc = await tx.workshopDocument.create({
        data: {
          workshop_id: wsIdBig,
          original_file_name: fileName,
          storage_path: storagePath,
          file_size_bytes: fileSize ? BigInt(fileSize) : null,
          mime_type: 'application/pdf',
          uploaded_by: userIdBig,
          upload_status: 'uploaded'
        }
      });

      // 2. Create AiSummary record
      const summary = await tx.aiSummary.create({
        data: {
          workshop_id: wsIdBig,
          document_id: doc.id,
          status: 'pending',
          ai_model: 'gemini-1.5-flash'
        }
      });

      return { doc, summary };
    });

    // 3. Trigger RabbitMQ task
    try {
      const channel = getChannel();
      if (channel) {
        const message = {
          summary_id: result.summary.id.toString(),
          file_path: storagePath, // In production, this might be a full URL or S3 path
          workshop_id: workshopId.toString()
        };
        
        channel.sendToQueue('ai_summary_tasks', Buffer.from(JSON.stringify(message)), {
          persistent: true
        });
        console.log(`[WorkshopService] Published AI summary task for summary ID: ${result.summary.id}`);
      }
    } catch (err) {
      console.warn('[WorkshopService] Failed to publish AI task to RabbitMQ:', err.message);
      // We don't fail the whole request if RabbitMQ is down, 
      // but the summary will stay in PENDING status.
    }

    return result;
  }
}

module.exports = WorkshopService;
