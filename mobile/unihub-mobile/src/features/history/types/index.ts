export interface CheckInHistory {
  id: string;
  studentName: string;
  studentId: string;
  workshopTitle: string;
  timestamp: string;
  status: 'synced' | 'pending';
}
