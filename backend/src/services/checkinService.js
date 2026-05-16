const prisma = require('../config/db');
const jwt = require('jsonwebtoken');

class CheckinService {
  /**
   * Fetches all valid (confirmed) tickets for a specific workshop.
   * Used by staff to pre-fetch data for offline check-in.
   * 
   * @param {number|bigint} workshopId 
   * @returns {Promise<Array>} List of valid tickets
   */
  static async getValidTickets(workshopId) {
    const workshopIdBig = BigInt(workshopId);

    const registrations = await prisma.registration.findMany({
      where: {
        workshop_id: workshopIdBig,
        status: 'confirmed'
      },
      select: {
        id: true,
        student: {
          select: {
            student_code: true,
            full_name: true,
            user_id: true
          }
        },
        checkin: {
          select: {
            id: true
          }
        }
      }
    });

    return registrations.map(reg => ({
      tid: reg.id.toString(),
      sid: reg.student.student_code,
      uid: reg.student.user_id ? reg.student.user_id.toString() : null,
      name: reg.student.full_name,
      checked_in: !!reg.checkin
    }));
  }

  /**
   * Processes a batch of check-ins synced from a mobile device.
   * Implements idempotency using database unique constraints.
   * 
   * @param {Array} checkins Array of { tid, client_timestamp }
   * @param {number|bigint} staffUserId 
   * @param {string} deviceId 
   * @returns {Promise<Object>} Summary of sync results
   */
  static async syncCheckins(checkins, staffUserId, deviceId) {
    const staffIdBig = BigInt(staffUserId);
    const results = {
      total: checkins.length,
      synced: 0,
      failed: 0,
      already_synced: 0,
      synced_ids: []
    };

    // We process each checkin in a transaction to ensure atomicity for each record
    // but continue if one fails (e.g. invalid ticket ID)
    for (const item of checkins) {
      try {
        let ticketId = item.tid;

        // 1. VERIFY JWT (If provided)
        if (item.qr_token) {
          try {
            const decoded = jwt.verify(item.qr_token, process.env.QR_SECRET || 'unihub-qr-secret');
            ticketId = decoded.tid;
            console.log(`[Sync] Verified JWT for ticket ID: ${ticketId}`);
          } catch (err) {
            console.error(`[Sync] JWT Verification failed for item:`, err.message);
            results.failed++;
            continue;
          }
        } else {
          // Backward compatibility or legacy support (though we should enforce JWT soon)
          console.warn(`[Sync] No qr_token provided for ticket ${item.tid}. Proceeding with raw ID (Insecure).`);
        }

        const ticketIdBig = BigInt(ticketId);
        
        // 2. Find registration and its QR code
        const registration = await prisma.registration.findUnique({
          where: { id: ticketIdBig },
          include: { qr_code: true }
        });

        if (!registration) {
          console.warn(`[Sync] Registration not found for ticket ID: ${ticketId}`);
          results.failed++;
          continue;
        }

        if (registration.status !== 'confirmed') {
          console.warn(`[Sync] Ticket ${item.tid} status is ${registration.status}, not confirmed.`);
          results.failed++;
          continue;
        }

        // Create checkin record
        // Use nested connects for relations to satisfy Prisma validation
        const checkinData = {
          registration: { connect: { id: ticketIdBig } },
          scanned_by: { connect: { id: staffIdBig } },
          is_offline: true,
          device_id: deviceId,
          client_timestamp: item.client_timestamp ? new Date(item.client_timestamp) : null,
          synced_at: new Date()
        };

        // ONLY add qr_code if it exists in the database
        // This prevents "Argument qr_code is missing" if the client expects it
        // and registration.qr_code is null.
        if (registration.qr_code && registration.qr_code.id) {
          checkinData.qr_code = { connect: { id: registration.qr_code.id } };
        }

        await prisma.checkin.create({
          data: checkinData
        });

        console.log(`[Sync] Successfully synced ticket ID: ${item.tid}`);
        results.synced++;
        results.synced_ids.push(item.tid);
      } catch (err) {
        // P2002/P2014 are Prisma unique/relation constraint violations (already checked in)
        if (err.code === 'P2002' || err.code === 'P2014') {
          console.log(`[Sync] Ticket ${item.tid} was already synced (Duplicate).`);
          results.already_synced++;
          results.synced_ids.push(item.tid);
        } else {
          console.error(`[Sync] CRITICAL FAILURE for ticket ${item.tid}:`, err);
          results.failed++;
        }
      }
    }

    // Log the batch
    await prisma.offlineSyncBatch.create({
      data: {
        device_id: deviceId || 'unknown',
        staff_user_id: staffIdBig,
        batch_data: JSON.stringify(checkins),
        total_records: results.total,
        synced_records: results.synced,
        failed_records: results.failed,
        sync_status: results.failed === 0 ? 'completed' : 'partial_failed',
        synced_at: new Date()
      }
    });

    return results;
  }

  /**
   * Fetches check-in history with pagination and search.
   * 
   * @param {Object} params { page, limit, search }
   * @returns {Promise<Object>} Paginated history
   */
  static async getCheckinHistory({ page = 1, limit = 20, search = '' }) {
    const skip = (page - 1) * limit;

    const where = {};
    if (search) {
      where.OR = [
        { registration: { student: { student_code: { contains: search, mode: 'insensitive' } } } },
        { registration: { student: { full_name: { contains: search, mode: 'insensitive' } } } },
        { registration: { workshop: { title: { contains: search, mode: 'insensitive' } } } }
      ];
    }

    const [total, checkins] = await Promise.all([
      prisma.checkin.count({ where }),
      prisma.checkin.findMany({
        where,
        include: {
          registration: {
            include: {
              student: { select: { full_name: true, student_code: true } },
              workshop: { select: { title: true } }
            }
          },
          scanned_by: { select: { full_name: true } }
        },
        orderBy: { server_timestamp: 'desc' },
        skip,
        take: limit
      })
    ]);

    return {
      total,
      page,
      limit,
      hasMore: skip + checkins.length < total,
      data: checkins.map(c => ({
        id: c.id.toString(),
        ticketId: c.registration_id.toString(), // Add this to match with local tid
        studentName: c.registration.student.full_name,
        studentCode: c.registration.student.student_code,
        workshopTitle: c.registration.workshop.title,
        checkInTime: c.server_timestamp,
        isOffline: c.is_offline,
        staffName: c.scanned_by.full_name
      }))
    };
  }
}

module.exports = CheckinService;
