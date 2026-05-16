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
    status: 'PENDING_PAYMENT',
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
  async list() {
    const response = await fetch('/api/v1/tickets/my-tickets', { headers: authHeaders() });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch tickets');
    }
    return await response.json();
  },

  async getById(id) {
    const response = await fetch(`/api/v1/registrations/${id}`, { headers: authHeaders() });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch registration details');
    }
    return await response.json();
  },
  
  async register(workshopId, idempotencyKey) {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/v1/registrations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({ workshopId }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Registration failed');
      }
      
      const data = await response.json();
      
      // Map new backend outcome to frontend expectations
      return {
        id: data.registrationId,
        status: data.outcome,
        requires_payment: data.outcome === 'PAID_PENDING_PAYMENT' || data.outcome === 'PAID_GATEWAY_ERROR',
        payment_url: data.paymentUrl,
        registration_id: data.registrationId
      };
    } catch (error) {
      console.error('Registration API Error:', error);
      throw error;
    }
  },

  async getRegistrationStatus(id) {
    const response = await fetch(`/api/v1/registrations/${id}`, { headers: authHeaders() });
    if (!response.ok) throw new Error('Failed to fetch status');
    return await response.json();
  },

  async getPaymentById(paymentId) {
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      id: paymentId,
      amount: 50000,
      currency: 'VND',
      workshop: {
        title: 'Professional Workshop',
        room: { room_code: 'A-101', building: 'Main Hall' }
      },
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    };
  },

  async confirmPayment(paymentId, idempotencyKey) {
    const response = await fetch(`/api/v1/payments/${paymentId}/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey,
        ...authHeaders(),
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Payment confirmation failed');
    }
    return await response.json();
  },

  async cancel(id) {
    const response = await fetch(`/api/v1/registrations/${id}/cancel`, {
      method: 'POST',
      headers: authHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to cancel registration');
    }
    return await response.json();
  }
};
