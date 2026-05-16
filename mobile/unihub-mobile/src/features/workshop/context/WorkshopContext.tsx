import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { Workshop, Speaker } from '../types';
import { apiClient } from '@/shared/api/api-client';

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
    id: ws.id,
    title: ws.title,
    room: `${ws.room?.room_code || 'TBA'} - ${ws.room?.building || 'TBA'}`,
    start_date: ws.start_time || ws.event_day,
    end_date: ws.end_time || ws.start_time,
    status: ws.status,
    is_paid: ws.is_paid,
    available_seats: ws.available_seats,
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

  const fetchWorkshops = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get('/v1/workshops');
      if (response.ok && response.data) {
        const rawData = response.data.data || [];
        const normalized = rawData.map(normalizeWorkshop);
        setWorkshops(normalized);
        setTotalWorkshops(response.data.total || 0);
        setOngoingCount(response.data.ongoingCount || 0);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

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
