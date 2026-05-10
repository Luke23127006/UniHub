import api from '@/utils/api';

/**
 * GET /v1/analytics/overview
 *
 * Expected response shape:
 * {
 *   data: {
 *     metrics: {
 *       totalRegistrations: number,
 *       availableSeats:     number,
 *       fillRate:           number,   // 0-100
 *       totalRevenue:       number,   // VNĐ
 *     },
 *     workshopStats: Array<{
 *       workshopId:    string,
 *       title:         string,
 *       registrations: number,
 *     }>,
 *     lastRefreshedAt: string,        // ISO 8601
 *   }
 * }
 */
export const getAnalyticsOverview = (params) =>
  api.get('/v1/analytics/overview', { params });
