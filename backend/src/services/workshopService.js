const prisma = require('../config/db');
const { redisPublisher } = require('../config/redisPubSub');

class WorkshopService {
  /**
   * Returns all published workshops ordered by event day.
   *
   * @returns {Promise<Array<{id: string, title: string, event_day: Date, start_time: Date, end_time: Date, capacity: number, available_seats: number, is_paid: boolean, price: *, room: object, workshop_speakers: Array}>>}
   */
  static async getAllWorkshops() {
    const workshops = await prisma.workshop.findMany({
      where: { status: 'published' },
      select: {
        id: true,
        title: true,
        event_day: true,
        start_time: true,
        end_time: true,
        capacity: true,
        available_seats: true,
        is_paid: true,
        price: true,
        room: { select: { name: true, building: true } },
        workshop_speakers: {
          select: { speaker: { select: { full_name: true, title: true } }, is_main_speaker: true },
          orderBy: { display_order: 'asc' },
        },
      },
      orderBy: { event_day: 'asc' },
    });
    return workshops.map((w) => ({ ...w, id: w.id.toString() }));
  }

  /**
   * Returns a single workshop by ID, or null if not found.
   *
   * @param {number|string} id
   * @returns {Promise<object|null>}
   */
  static async getWorkshopById(id) {
    const workshop = await prisma.workshop.findUnique({
      where: { id: BigInt(id) },
      select: {
        id: true,
        title: true,
        description: true,
        event_day: true,
        start_time: true,
        end_time: true,
        capacity: true,
        available_seats: true,
        is_paid: true,
        price: true,
        status: true,
        room: { select: { name: true, building: true, floor: true, layout_image_url: true } },
        workshop_speakers: {
          select: {
            is_main_speaker: true,
            speaker: { select: { full_name: true, title: true, organization: true, bio: true, avatar_url: true } },
          },
          orderBy: { display_order: 'asc' },
        },
        ai_summaries: {
          where: { status: 'completed' },
          select: { summary_text: true, completed_at: true },
          orderBy: { completed_at: 'desc' },
          take: 1,
        },
      },
    });

    if (!workshop) return null;
    return { ...workshop, id: workshop.id.toString() };
  }

  static async processRegistration(userId, workshopId) {
    // Prisma requires BigInt values for BigInt schema columns.
    // IDs arrive as JS numbers (from JSON payloads) or strings — both coerce correctly.
    const userIdBig = BigInt(userId);
    const workshopIdBig = BigInt(workshopId);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Check available_seats of the workshop
      const workshop = await tx.workshop.findUnique({
        where: { id: workshopIdBig },
        select: { id: true, available_seats: true, capacity: true }
      });

      if (!workshop) {
        throw new Error(`Workshop ${workshopId} not found`);
      }

      // 2. Find the Student associated with the userId
      const student = await tx.student.findUnique({
        where: { user_id: userIdBig },
        select: { id: true }
      });

      if (!student) {
        throw new Error(`Student record not found for user ${userId}`);
      }

      // 3. Check if user already registered
      // student.id and workshop.id are already BigInt (returned by Prisma)
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
}

module.exports = WorkshopService;
