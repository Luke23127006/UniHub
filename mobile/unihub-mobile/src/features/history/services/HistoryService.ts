import { CheckInHistory } from '../types';
import { apiClient } from '@/shared/api/api-client';
import { getDb } from '@/shared/utils/db';

export class HistoryService {
  /**
   * Fetches the check-in history from local DB and server
   */
  static async getHistory(
    page: number = 1,
    limit: number = 10,
    search: string = '',
    filter: 'all' | 'synced' | 'pending' = 'all'
  ): Promise<{ 
    data: CheckInHistory[]; 
    hasMore: boolean; 
    total: number;
    counts: { all: number; synced: number; pending: number };
  }> {
    try {
      // 1. Fetch Local Check-ins from SQLite joined with sync_queue
      const db = await getDb();
      let localData: CheckInHistory[] = [];
      
      const localResults: any[] = await db.getAllAsync(
        `SELECT t.*, q.synced as is_synced_in_queue 
         FROM tickets t 
         LEFT JOIN sync_queue q ON t.tid = q.tid
         WHERE t.status = 1 AND (t.student_name LIKE ? OR t.student_code LIKE ?) 
         ORDER BY t.checkin_time DESC`,
        [`%${search}%`, `%${search}%`]
      );
 
      localData = localResults.map(r => ({
        id: r.tid,
        studentName: r.student_name,
        studentCode: r.student_code,
        workshopTitle: r.workshop_title || 'Workshop tại máy',
        checkInTime: r.checkin_time,
        isOffline: true,
        isLocalOnly: r.is_synced_in_queue !== 1 // If synced in queue, it's NOT local only anymore
      }));

      // 2. Fetch Server History
      let serverData: CheckInHistory[] = [];
      let total = localData.length;
      let hasMore = false;

      try {
        const response = await apiClient.get('/v1/checkin/history', {
          params: { page, limit, search }
        } as any);

        if (response.ok && response.data) {
          // Handle both { data: [...] } and raw [...] response formats
          const rawData = response.data.data || response.data;
          serverData = Array.isArray(rawData) ? rawData : [];
          total = response.data.total || serverData.length;
          hasMore = !!response.data.hasMore;
        }
      } catch (err) {
        console.warn('Could not fetch server history, showing local only:', err);
      }

      // 3. Merge and deduplicate
      const merged = [...localData];
      
      if (Array.isArray(serverData)) {
        serverData.forEach(sItem => {
          // Check if local TID (l.id) matches server registration_id (sItem.ticketId)
          const localIndex = merged.findIndex(l => l.id === sItem.ticketId);
          if (localIndex !== -1) {
            // Match found! Update local entry with server data
            merged[localIndex] = { ...sItem, isLocalOnly: false } as CheckInHistory;
          } else {
            merged.push(sItem);
          }
        });
      }

      // 4. Calculate Counts
      const allCount = merged.length;
      const syncedCount = merged.filter(item => !item.isLocalOnly).length;
      const pendingCount = merged.filter(item => item.isLocalOnly).length;

      // 5. Apply Filter
      let filtered = merged;
      if (filter === 'synced') {
        filtered = merged.filter(item => !item.isLocalOnly);
      } else if (filter === 'pending') {
        filtered = merged.filter(item => item.isLocalOnly);
      }

      // Sort by time descending
      filtered.sort((a, b) => new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime());

      // Paginate filtered list
      const start = (page - 1) * limit;
      const paginated = filtered.slice(start, start + limit);

      return {
        data: paginated,
        hasMore: hasMore || (start + limit < filtered.length),
        total: filtered.length,
        counts: {
          all: allCount,
          synced: syncedCount,
          pending: pendingCount
        }
      };
    } catch (error) {
      console.error('History Fetch Error:', error);
      throw error;
    }
  }
}
