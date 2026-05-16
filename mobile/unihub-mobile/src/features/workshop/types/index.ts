export interface Speaker {
  full_name: string;
  avatar_url?: string;
}

export interface Workshop {
  id: string;
  title: string;
  room: string;
  start_date: string;
  end_date: string;
  status: 'published' | 'completed' | 'cancelled' | 'draft';
  is_paid: boolean;
  capacity: number;
  available_seats: number;
  registration_count: number;
  checkin_count: number;
  speakers: Speaker[];
}
