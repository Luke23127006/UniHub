import { CheckInHistory } from '../types';

export const MOCK_HISTORY: CheckInHistory[] = [
  {
    id: '1',
    studentName: 'Nguyen Van A',
    studentId: '21127001',
    workshopTitle: 'Future of AI in Software Engineering',
    timestamp: '2026-05-14T16:05:22Z',
    status: 'synced',
  },
  {
    id: '2',
    studentName: 'Tran Thi B',
    studentId: '21127002',
    workshopTitle: 'Future of AI in Software Engineering',
    timestamp: '2026-05-14T16:08:45Z',
    status: 'synced',
  },
  {
    id: '3',
    studentName: 'Le Van C',
    studentId: '21127003',
    workshopTitle: 'Blockchain & Decentralized Apps',
    timestamp: '2026-05-14T17:15:10Z',
    status: 'pending',
  },
  {
    id: '4',
    studentName: 'Pham Minh D',
    studentId: '21127004',
    workshopTitle: 'Blockchain & Decentralized Apps',
    timestamp: '2026-05-14T17:20:05Z',
    status: 'pending',
  },
  {
    id: '5',
    studentName: 'Hoang Thi E',
    studentId: '21127005',
    workshopTitle: 'Cybersecurity Essentials 2026',
    timestamp: '2026-05-13T14:30:00Z',
    status: 'synced',
  },
];
