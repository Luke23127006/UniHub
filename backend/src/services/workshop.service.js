const prisma = require('../config/db');

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
          }
        },
        orderBy: { event_day: 'asc' },
        take: parseInt(limit),
        skip: parseInt(offset),
      })
    ]);

    // Flatten speakers and format BigInt to string
    const formattedWorkshops = workshops.map(ws => ({
      ...ws,
      id: ws.id.toString(),
      room_id: ws.room_id.toString(),
      created_by: ws.created_by.toString(),
      price: ws.price ? parseFloat(ws.price.toString()) : null,
      speakers: ws.workshop_speakers.map(wsSpeaker => ({
        ...wsSpeaker.speaker,
        id: wsSpeaker.speaker.id.toString(),
        is_main: wsSpeaker.is_main_speaker
      }))
    }));

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
}

module.exports = WorkshopService;
