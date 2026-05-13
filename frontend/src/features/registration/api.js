export const MOCK_TICKETS = [
  {
    id: 'TKT-1001',
    workshop_id: '1',
    workshop: {
      title: 'Introduction to Machine Learning with Python',
      start_time: '2026-05-20T09:00:00Z',
      room: { room_code: 'CS-101', building: 'Engineering Block' }
    },
    status: 'CONFIRMED', 
    payment_status: 'PAID',
    price: 50000,
    currency: 'VND',
    created_at: '2026-05-01T10:30:00Z'
  },
  {
    id: 'TKT-1002',
    workshop_id: '2',
    workshop: {
      title: 'Design Thinking Workshop',
      start_time: '2026-05-22T14:00:00Z',
      room: { room_code: 'A-204', building: 'Main Campus' }
    },
    status: 'PENDING',
    payment_status: 'PENDING',
    price: 100000,
    currency: 'VND',
    created_at: '2026-05-10T15:20:00Z'
  },
  {
    id: 'TKT-1003',
    workshop_id: '3',
    workshop: {
      title: 'Career Fair Preparation',
      start_time: '2026-06-05T08:30:00Z',
      room: { room_code: 'Hall B', building: 'Student Center' }
    },
    status: 'CONFIRMED',
    payment_status: 'FREE',
    price: 0,
    currency: 'VND',
    created_at: '2026-05-11T09:00:00Z'
  },
  {
    id: 'TKT-1004',
    workshop_id: '4',
    workshop: {
      title: 'Advanced React Patterns',
      start_time: '2026-04-15T10:00:00Z',
      room: { room_code: 'Lab 3', building: 'Tech Center' }
    },
    status: 'CANCELLED',
    payment_status: 'REFUNDED',
    price: 200000,
    currency: 'VND',
    created_at: '2026-04-01T11:00:00Z'
  }
];

export const ticketApi = {
  list: async () => MOCK_TICKETS,
  getById: async (id) => MOCK_TICKETS.find(t => t.id === id),
};
