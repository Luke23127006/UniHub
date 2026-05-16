import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { Workshop } from '../types';
import { apiClient } from '@/shared/api/api-client';
import { getDb, initDatabase } from '@/shared/utils/db';

interface WorkshopContextType {
  workshops: Workshop[];
  totalWorkshops: number;
  ongoingCount: number;
  selectedWorkshop: Workshop | null;
  isLoading: boolean;
  selectWorkshop: (workshop: Workshop | null) => void;
  fetchWorkshops: () => Promise<void>;
}

const WorkshopContext = createContext<WorkshopContextType | undefined>(undefined);

function normalizeWorkshop(ws: any): Workshop {
  return {
    id: ws.id.toString(),
    title: ws.title,
    room: `${ws.room?.room_code || 'TBA'} - ${ws.room?.building || 'TBA'}`,
    start_date: ws.start_time || ws.event_day,
    end_date: ws.end_time || ws.start_time,
    status: ws.status,
    is_paid: ws.is_paid,
    capacity: ws.capacity,
    available_seats: ws.available_seats,
    registration_count: ws.registration_count || 0,
    checkin_count: ws.checkin_count || 0,
    speakers: (ws.speakers || []).map((s: any) => ({
      full_name: s.full_name,
      avatar_url: s.avatar_url
    }))
  };
}

export function WorkshopProvider({ children }: { children: ReactNode }) {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [totalWorkshops, setTotalWorkshops] = useState(0);
  const [ongoingCount, setOngoingCount] = useState(0);
  const [selectedWorkshop, setSelectedWorkshop] = useState<Workshop | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const selectWorkshop = (workshop: Workshop | null) => {
    setSelectedWorkshop(workshop);
  };

  const loadWorkshopsFromLocal = async () => {
    try {
      const db = await getDb();
      const localResults: any[] = await db.getAllAsync('SELECT * FROM workshops');
      if (localResults && localResults.length > 0) {
        const mapped: Workshop[] = localResults.map(r => ({
          id: r.id,
          title: r.title,
          room: r.room,
          start_date: r.start_date,
          end_date: r.end_date,
          registration_count: r.registration_count,
          capacity: r.capacity,
          is_paid: !!r.is_paid,
          available_seats: r.capacity - r.registration_count,
          status: 'published', // Placeholder
          checkin_count: 0,
          speakers: []
        }));
        setWorkshops(mapped);
        setTotalWorkshops(mapped.length);
        console.log(`[Offline] Loaded ${mapped.length} workshops from local DB.`);
      }
    } catch (err) {
      // Silent
    }
  };

  const fetchWorkshops = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get('/v1/workshops');
      const db = await getDb();

      if (response.ok && response.data) {
        const rawData = Array.isArray(response.data) ? response.data : (response.data.data || []);
        const normalized = rawData.map(normalizeWorkshop);
        
        setWorkshops(normalized);
        setTotalWorkshops(Array.isArray(response.data) ? rawData.length : (response.data.total || rawData.length));
        setOngoingCount(Array.isArray(response.data) ? 0 : (response.data.ongoingCount || 0));

        // Cache to SQLite - safer approach
        try {
          await db.runAsync('DELETE FROM workshops');
          for (const ws of normalized) {
            if (!ws.id) continue;
            await db.runAsync(
              'INSERT OR REPLACE INTO workshops (id, title, room, start_date, end_date, registration_count, capacity, is_paid) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
              [ws.id.toString(), ws.title || 'Untitled', ws.room || 'TBA', ws.start_date || '', ws.end_date || '', ws.registration_count || 0, ws.capacity || 0, ws.is_paid ? 1 : 0]
            );
          }
          console.log(`[Cache] Successfully cached ${normalized.length} workshops.`);
        } catch (cacheErr) {
          console.error('[Cache] Failed to save workshops to SQLite:', cacheErr);
        }
      } else {
        // Fallback to SQLite if API fails
        await loadWorkshopsFromLocal();
      }
    } catch (error) {
      console.error('Fetch error:', error);
      await loadWorkshopsFromLocal();
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize DB and fetch on mount
  useEffect(() => {
    const setup = async () => {
      await initDatabase();
      await fetchWorkshops();
    };
    setup();
  }, [fetchWorkshops]);

  return (
    <WorkshopContext.Provider value={{ 
      workshops, 
      totalWorkshops,
      ongoingCount,
      selectedWorkshop, 
      isLoading,
      selectWorkshop, 
      fetchWorkshops 
    }}>
      {children}
    </WorkshopContext.Provider>
  );
}

export function useWorkshop() {
  const context = useContext(WorkshopContext);
  if (context === undefined) {
    throw new Error('useWorkshop must be used within a WorkshopProvider');
  }
  return context;
}
