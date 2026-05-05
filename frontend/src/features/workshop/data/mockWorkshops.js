/**
 * Mock workshop data — mirrors the shape returned by the real API
 * (derived from the Prisma schema).  Replace with an API call when the
 * backend endpoints are ready; no other file needs to change.
 */

/** @typedef {'draft'|'published'|'cancelled'|'completed'} WorkshopStatus */

/** @type {Array<Object>} */
export const MOCK_WORKSHOPS = [
  {
    id: 1,
    title: 'Introduction to Machine Learning with Python',
    description:
      'A hands-on workshop covering supervised learning, model evaluation, and scikit-learn. Bring your laptop.',
    status: 'published',
    is_paid: false,
    price: null,
    currency: null,
    capacity: 50,
    available_seats: 12,
    event_day: '2026-05-20',
    start_time: '2026-05-20T09:00:00',
    end_time: '2026-05-20T12:00:00',
    room: { room_code: 'CS-101', name: 'Computer Science Lab 1', building: 'Engineering Block' },
    speakers: [
      { full_name: 'Dr. Sarah Chen', title: 'Associate Professor', organization: 'Dept. of Computer Science' },
    ],
  },
  {
    id: 2,
    title: 'Academic Writing for Research Papers',
    description:
      'Learn how to structure arguments, cite sources correctly, and write compelling abstracts for academic journals.',
    status: 'published',
    is_paid: false,
    price: null,
    currency: null,
    capacity: 30,
    available_seats: 0,
    event_day: '2026-05-22',
    start_time: '2026-05-22T14:00:00',
    end_time: '2026-05-22T16:30:00',
    room: { room_code: 'HUM-203', name: 'Humanities Seminar Room', building: 'Arts Building' },
    speakers: [
      { full_name: 'Prof. James Whitmore', title: 'Professor of English', organization: 'Dept. of Languages' },
    ],
  },
  {
    id: 3,
    title: 'Entrepreneurship Bootcamp: From Idea to MVP',
    description:
      'Two-day intensive covering lean startup methodology, pitch decks, and finding your first customers.',
    status: 'published',
    is_paid: true,
    price: 150000,
    currency: 'VND',
    capacity: 40,
    available_seats: 8,
    event_day: '2026-05-25',
    start_time: '2026-05-25T08:00:00',
    end_time: '2026-05-25T17:00:00',
    room: { room_code: 'BIZ-301', name: 'Innovation Hub', building: 'Business School' },
    speakers: [
      { full_name: 'Nguyen Thi Lan', title: 'Co-founder & CEO', organization: 'TechStart Vietnam' },
      { full_name: 'Tran Minh Duc', title: 'Venture Partner', organization: 'Mekong Capital' },
    ],
  },
  {
    id: 4,
    title: 'Research Methodology Fundamentals',
    description:
      'Covers quantitative and qualitative research design, hypothesis formation, and statistical analysis.',
    status: 'completed',
    is_paid: false,
    price: null,
    currency: null,
    capacity: 35,
    available_seats: 0,
    event_day: '2026-04-10',
    start_time: '2026-04-10T09:00:00',
    end_time: '2026-04-10T11:30:00',
    room: { room_code: 'SCI-105', name: 'Science Lecture Hall', building: 'Science Block' },
    speakers: [
      { full_name: 'Dr. Le Van Thanh', title: 'Senior Researcher', organization: 'Dept. of Social Sciences' },
    ],
  },
  {
    id: 5,
    title: 'Full-Stack Web Development with React & Node',
    description:
      'Build a complete CRUD application from scratch using React 19, Express, and PostgreSQL.',
    status: 'published',
    is_paid: true,
    price: 200000,
    currency: 'VND',
    capacity: 60,
    available_seats: 31,
    event_day: '2026-06-03',
    start_time: '2026-06-03T08:30:00',
    end_time: '2026-06-03T17:30:00',
    room: { room_code: 'CS-205', name: 'Computer Science Lab 2', building: 'Engineering Block' },
    speakers: [
      { full_name: 'Pham Quoc Bao', title: 'Senior Engineer', organization: 'FPT Software' },
    ],
  },
  {
    id: 6,
    title: 'Data Analysis & Visualization with Excel',
    description:
      'Master pivot tables, VLOOKUP, and data visualisation techniques for business reporting.',
    status: 'cancelled',
    is_paid: false,
    price: null,
    currency: null,
    capacity: 45,
    available_seats: 45,
    event_day: '2026-05-15',
    start_time: '2026-05-15T13:00:00',
    end_time: '2026-05-15T15:00:00',
    room: { room_code: 'BIZ-102', name: 'Business Computing Room', building: 'Business School' },
    speakers: [
      { full_name: 'Dr. Kim Anh Phuong', title: 'Lecturer', organization: 'Dept. of Finance' },
    ],
  },
  {
    id: 7,
    title: 'Leadership & Communication Skills',
    description:
      'Practical workshop on public speaking, active listening, and managing cross-functional teams.',
    status: 'published',
    is_paid: false,
    price: null,
    currency: null,
    capacity: 25,
    available_seats: 3,
    event_day: '2026-05-28',
    start_time: '2026-05-28T10:00:00',
    end_time: '2026-05-28T13:00:00',
    room: { room_code: 'MGT-401', name: 'Management Training Room', building: 'Admin Tower' },
    speakers: [
      { full_name: 'Vo Thi Huong', title: 'Executive Coach', organization: 'VN Leadership Institute' },
      { full_name: 'David Nguyen', title: 'HR Director', organization: 'Unilever Vietnam' },
    ],
  },
  {
    id: 8,
    title: 'Introduction to Blockchain & Web3',
    description:
      'Demystifying distributed ledgers, smart contracts, and practical DeFi use cases for students.',
    status: 'draft',
    is_paid: false,
    price: null,
    currency: null,
    capacity: 60,
    available_seats: 60,
    event_day: '2026-06-15',
    start_time: '2026-06-15T09:00:00',
    end_time: '2026-06-15T11:00:00',
    room: { room_code: 'CS-301', name: 'Auditorium A', building: 'Engineering Block' },
    speakers: [
      { full_name: 'Dr. Hoang Minh', title: 'Blockchain Researcher', organization: 'VinAI Research' },
    ],
  },
];
