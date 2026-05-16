const prisma = require('../config/db');
const jwt = require('jsonwebtoken');

class CheckinService {
  static async getValidTickets(workshopId) {
    const workshopIdBig = BigInt(workshopId);
    const registrations = await prisma.registration.findMany({
      where: { workshop_id: workshopIdBig, status: 'confirmed' },
      select: {
        id: true,
        student: { select: { student_code: true, full_name: true, user_id: true } },
        checkin: { select: { id: true } }
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

  static async syncCheckins(checkins, staffUserId, deviceId) {
    const staffId = BigInt(staffUserId);
    const results = { total: checkins.length, synced: 0, failed: 0, already_synced: 0, synced_ids: [] };

    for (const item of checkins) {
      try {
        let ticketId = item.tid;

        // 1. Extract Ticket ID from QR Token
        if (item.qr_token) {
          try {
            const decoded = jwt.verify(item.qr_token, process.env.QR_SECRET || 'unihub-qr-secret');
            ticketId = decoded.tid;
          } catch (err) {
            console.error(`[Sync] JWT Verification failed: ${err.message}`);
            results.failed++;
            continue;
          }
        }

        if (!ticketId) {
          results.failed++;
          continue;
        }

        const registrationId = BigInt(ticketId);

        // 2. Idempotency Check
        const existing = await prisma.checkin.findUnique({
          where: { registration_id: registrationId }
        });

        if (existing) {
          results.already_synced++;
          results.synced_ids.push(ticketId.toString());
          continue;
        }

        // 3. Find Registration with QR Code
        const registration = await prisma.registration.findUnique({
          where: { id: registrationId },
          include: { qr_code: true, student: true }
        });

        if (!registration) {
          console.warn(`[Sync] Registration ${registrationId} not found.`);
          results.failed++;
          continue;
        }

        // 4. Ensure QR Code exists (Self-Healing)
        let qrCodeId = registration.qr_code?.id;
        
        if (!qrCodeId) {
          console.log(`[Sync] QR Code missing for registration ${registrationId}. Healing...`);
          try {
            const userId = registration.student?.user_id?.toString() || 'unknown';
            const payload = {
              tid: registration.id.toString(),
              uid: userId,
              wid: registration.workshop_id.toString(),
              iat: Math.floor(Date.now() / 1000)
            };
            const secret = process.env.QR_SECRET || process.env.JWT_ACCESS_SECRET || 'unihub-qr-secret';
            const code = jwt.sign(payload, secret);

            const newQr = await prisma.qrCode.create({
              data: {
                registration_id: registrationId,
                code: code,
                is_valid: true,
                generated_at: new Date()
              }
            });
            qrCodeId = newQr.id;
          } catch (healErr) {
            console.error(`[Sync] Healing failed: ${healErr.message}`);
            // If healing fails, we still try to insert (maybe DB allows null now)
          }
        }

        // 5. Create Checkin
        const checkinData = {
          registration: { connect: { id: registrationId } },
          scanned_by: { connect: { id: staffId } },
          is_offline: true,
          device_id: deviceId || 'unknown',
          client_timestamp: item.client_timestamp ? new Date(item.client_timestamp) : null
        };

        if (qrCodeId) {
          checkinData.qr_code = { connect: { id: qrCodeId } };
        }

        await prisma.checkin.create({ data: checkinData });
        
        results.synced++;
        results.synced_ids.push(ticketId.toString());
      } catch (err) {
        console.error(`[Sync] CRITICAL Error for ticket ${item.tid}:`, err.message);
        results.failed++;
      }
    }

    // Batch Audit Log
    try {
      await prisma.offlineSyncBatch.create({
        data: {
          device_id: deviceId || 'unknown',
          staff_user_id: staffId,
          batch_data: JSON.stringify(checkins),
          total_records: results.total,
          synced_records: results.synced,
          failed_records: results.failed,
          sync_status: results.failed === 0 ? 'completed' : 'partial_failed',
          synced_at: new Date()
        }
      });
    } catch (e) {
      console.error('[Sync] Batch log failed:', e.message);
    }

    return results;
  }

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
      total, page, limit,
      hasMore: skip + checkins.length < total,
      data: checkins.map(c => ({
        id: c.id.toString(),
        ticketId: c.registration_id.toString(),
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
