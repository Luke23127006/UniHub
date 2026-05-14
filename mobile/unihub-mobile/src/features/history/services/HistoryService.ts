import { CheckInHistory } from '../types';
import { MOCK_HISTORY } from '../constants/mock-data';

// Simulating a database or API call with delay and pagination
export class HistoryService {
  /**
   * Fetches a page of check-in history.
   * @param page Starting from 1
   * @param pageSize Number of items per page
   * @param filter Status filter
   * @param search Search query
   */
  static async fetchHistory(
    page: number,
    pageSize: number,
    filter: 'all' | 'synced' | 'pending' = 'all',
    search: string = ''
  ): Promise<{ data: CheckInHistory[]; hasMore: boolean; total: number }> {
    // 1. Simulate network/DB delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // 2. Apply filtering at "DB level"
    let filtered = [...MOCK_HISTORY];
    
    // For testing large datasets, we'll repeat the mock data if requested
    // (In a real app, this would be a SQL query)
    if (MOCK_HISTORY.length < 100) {
      for(let i=0; i<5; i++) {
        filtered = [...filtered, ...MOCK_HISTORY.map(h => ({...h, id: `${h.id}-${i}`}))];
      }
    }

    if (filter !== 'all') {
      filtered = filtered.filter(h => h.status === filter);
    }

    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(h => 
        h.studentName.toLowerCase().includes(s) || 
        h.studentId.includes(s) ||
        h.workshopTitle.toLowerCase().includes(s)
      );
    }

    // 3. Apply pagination
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const data = filtered.slice(start, end);
    
    return {
      data,
      hasMore: end < filtered.length,
      total: filtered.length
    };
  }
}
