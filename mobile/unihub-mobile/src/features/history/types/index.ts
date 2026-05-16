export interface CheckInHistory {
  id: string;
  ticketId?: string;
  studentName: string;
  studentCode: string;
  workshopTitle: string;
  checkInTime: string;
  isOffline: boolean;
  staffName?: string;
  isLocalOnly?: boolean;
}
