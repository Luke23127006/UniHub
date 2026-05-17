const prisma = require('../config/db');

/**
 * GET /api/v1/analytics/overview
 * Returns system-wide workshop metrics
 */
exports.getOverview = async (req, res) => {
  try {
    const { from, to } = req.query;

    const dateFilter = {};
    if (from && to) {
      dateFilter.created_at = {
        gte: new Date(from),
        lte: new Date(to),
      };
    }

    // 1. Fetch workshops with registration counts
    const workshops = await prisma.workshop.findMany({
      include: {
        _count: {
          select: { registrations: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    // 2. Aggregate metrics
    let totalRegistrations = 0;
    let totalAvailableSeats = 0;
    let totalCapacity = 0;
    let totalRevenue = 0;

    const workshopStats = workshops.map((ws) => {
      const regCount = ws._count.registrations;
      totalRegistrations += regCount;
      totalAvailableSeats += ws.available_seats;
      totalCapacity += ws.capacity;

      if (ws.is_paid && ws.price) {
        totalRevenue += regCount * Number(ws.price);
      }

      return {
        workshopId: ws.id,
        title: ws.title,
        registrations: regCount,
      };
    });

    const fillRate = totalCapacity > 0 ? (totalRegistrations / totalCapacity) * 100 : 0;

    return res.status(200).json({
      status: 'success',
      data: {
        metrics: {
          totalRegistrations,
          availableSeats: totalAvailableSeats,
          fillRate,
          totalRevenue,
        },
        workshopStats,
        lastRefreshedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[AnalyticsController] Error:', error);
    return res.status(500).json({
      status: 'error',
      error: { message: 'Internal server error while fetching analytics.' },
    });
  }
};
