const request = require('supertest');
const express = require('express');
const WorkshopController = require('../controllers/workshop.controller');
const WorkshopService = require('../services/workshop.service');

// Mock WorkshopService
jest.mock('../services/workshop.service');

const app = express();
app.use(express.json());

// Mock Authentication Middleware
const mockAuth = (req, res, next) => {
  req.user = { sub: 'creator-123' };
  next();
};

// Registered routes to test
app.put('/v1/workshops/:id', mockAuth, WorkshopController.update);
app.delete('/v1/workshops/:id', mockAuth, WorkshopController.delete);

describe('Workshop CRUD Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('PUT /v1/workshops/:id (Update)', () => {
    it('should return 200 and success status on successful update', async () => {
      const mockUpdated = { id: BigInt(10), title: 'New Title' };
      WorkshopService.updateWorkshop.mockResolvedValue(mockUpdated);

      const response = await request(app)
        .put('/v1/workshops/10')
        .send({
          title: 'New Title',
          speaker: 'Dr. Jane Doe',
          roomId: 'ROOM-1',
          totalSeats: 100,
          startTime: '2026-05-16T17:00:00.000Z',
          endTime: '2026-05-16T19:00:00.000Z',
          pricing: { isFree: true, amount: 0 }
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'success',
        data: {
          id: '10',
          message: 'Workshop updated successfully'
        }
      });
      expect(WorkshopService.updateWorkshop).toHaveBeenCalledWith(
        '10',
        expect.objectContaining({ title: 'New Title' }),
        'creator-123'
      );
    });

    it('should return 404 when workshop does not exist', async () => {
      const mockError = new Error('Workshop not found');
      mockError.statusCode = 404;
      WorkshopService.updateWorkshop.mockRejectedValue(mockError);

      const response = await request(app)
        .put('/v1/workshops/999')
        .send({ title: 'New Title' });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        status: 'error',
        message: 'Workshop not found'
      });
    });
  });

  describe('DELETE /v1/workshops/:id (Cancel)', () => {
    it('should return 200 and success status on successful cancel/delete', async () => {
      const mockCancelled = { id: BigInt(10), status: 'cancelled' };
      WorkshopService.cancelWorkshop.mockResolvedValue(mockCancelled);

      const response = await request(app).delete('/v1/workshops/10');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'success',
        data: {
          id: '10',
          message: 'Workshop cancelled successfully'
        }
      });
      expect(WorkshopService.cancelWorkshop).toHaveBeenCalledWith('10');
    });

    it('should return 500 when cancellation fails', async () => {
      WorkshopService.cancelWorkshop.mockRejectedValue(new Error('Database crash'));

      const response = await request(app).delete('/v1/workshops/10');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        status: 'error',
        message: 'Database crash'
      });
    });
  });
});
