const prisma = require('../config/db');

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
      already_synced: 0
    };

    // We process each checkin in a transaction to ensure atomicity for each record
    // but continue if one fails (e.g. invalid ticket ID)
    for (const item of checkins) {
      try {
        const ticketIdBig = BigInt(item.tid);
        
        // Find registration and its QR code
        const registration = await prisma.registration.findUnique({
          where: { id: ticketIdBig },
          include: { qr_code: true }
        });

        if (!registration) {
          results.failed++;
          continue;
        }

        // Create checkin record
        // Note: registration_id is @unique in Checkin model, so this will fail if already checked in
        await prisma.checkin.create({
          data: {
            registration_id: ticketIdBig,
            scanned_by_user_id: staffIdBig,
            qr_code_id: registration.qr_code ? registration.qr_code.id : 0, // Placeholder if no QR record
            is_offline: true,
            device_id: deviceId,
            client_timestamp: item.client_timestamp ? new Date(item.client_timestamp) : null,
            synced_at: new Date()
          }
        });

        results.synced++;
      } catch (err) {
        // P2002 is Prisma unique constraint violation (already checked in)
        if (err.code === 'P2002') {
          results.already_synced++;
        } else {
          console.error(`[CheckinService] Failed to sync ticket ${item.tid}:`, err.message);
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
}

module.exports = CheckinService;
