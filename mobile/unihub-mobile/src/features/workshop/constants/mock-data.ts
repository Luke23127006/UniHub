import { Workshop } from '../types';

export const MOCK_WORKSHOPS: Workshop[] = [
  {
    id: '1',
    title: 'Future of AI in Software Engineering',
    room: 'Hall A1',
    start_date: '2026-05-20T09:00:00Z',
    end_date: '2026-05-20T11:00:00Z',
    status: 'published',
    is_paid: false,
    available_seats: 120,
    checkin_count: 45,
    speakers: [{ full_name: 'Dr. Jane Smith' }]
  },
  {
    id: '2',
    title: 'Blockchain & Decentralized Apps',
    room: 'Lab 402',
    start_date: '2026-05-21T14:00:00Z',
    end_date: '2026-05-21T16:30:00Z',
    status: 'published',
    is_paid: true,
    available_seats: 50,
    checkin_count: 12,
    speakers: [{ full_name: 'Prof. Alan Turing' }]
  },
  {
    id: '3',
    title: 'Modern UI/UX Trends 2026',
    room: 'Design Studio',
    start_date: '2026-05-22T10:00:00Z',
    end_date: '2026-05-22T12:00:00Z',
    status: 'published',
    is_paid: false,
    available_seats: 80,
    checkin_count: 78,
    speakers: [{ full_name: 'Sarah Connor' }]
  },
  {
    id: '4',
    title: 'Cybersecurity Essentials for Staff',
    room: 'Hall B2',
    start_date: '2026-05-14T08:30:00Z',
    end_date: '2026-05-14T10:30:00Z',
    status: 'published',
    is_paid: false,
    available_seats: 200,
    checkin_count: 156,
    speakers: [{ full_name: 'John Doe' }]
  }
];
