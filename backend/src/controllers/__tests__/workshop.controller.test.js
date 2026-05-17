const WorkshopController = require('../workshop.controller');
const WorkshopService = require('../../services/workshop.service');

// Mock WorkshopService
jest.mock('../../services/workshop.service');

describe('WorkshopController', () => {
  let req, res;

  beforeEach(() => {
    req = {
      query: {},
      params: {}
    };
    res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
  });

  describe('list', () => {
    it('should return 200 and list of workshops', async () => {
      const mockResult = {
        total: 1,
        limit: 10,
        offset: 0,
        data: [{ id: '1', title: 'Workshop 1', speakers: [] }]
      };
      
      WorkshopService.listWorkshops.mockResolvedValue(mockResult);

      await WorkshopController.list(req, res);

      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockResult
      });
    });

    it('should return 500 when service fails', async () => {
      WorkshopService.listWorkshops.mockRejectedValue(new Error('DB Error'));

      await WorkshopController.list(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error'
        })
      );
    });
  });

  describe('getById', () => {
    it('should return 200 and workshop detail', async () => {
      const mockWorkshop = { id: '1', title: 'Workshop 1', speakers: [] };
      req.params.id = '1';
      
      WorkshopService.getWorkshopById.mockResolvedValue(mockWorkshop);

      await WorkshopController.getById(req, res);

      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockWorkshop
      });
    });

    it('should return 404 when workshop not found', async () => {
      req.params.id = '999';
      WorkshopService.getWorkshopById.mockResolvedValue(null);

      await WorkshopController.getById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error'
        })
      );
    });
  });

  describe('update', () => {
    it('should return 401 when user is unauthorized', async () => {
      req.user = null;
      await WorkshopController.update(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return 200 and updated workshop details on success', async () => {
      req.user = { sub: 'creator-123' };
      req.params.id = '1';
      req.body = { title: 'Updated Title' };
      
      const mockUpdated = { id: BigInt(1), title: 'Updated Title' };
      WorkshopService.updateWorkshop.mockResolvedValue(mockUpdated);

      await WorkshopController.update(req, res);

      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          id: '1',
          message: 'Workshop updated successfully'
        }
      });
      expect(WorkshopService.updateWorkshop).toHaveBeenCalledWith('1', req.body, 'creator-123');
    });

    it('should return service error status code if update fails', async () => {
      req.user = { sub: 'creator-123' };
      req.params.id = '1';
      
      const mockError = new Error('Not found');
      mockError.statusCode = 404;
      WorkshopService.updateWorkshop.mockRejectedValue(mockError);

      await WorkshopController.update(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: 'Not found'
        })
      );
    });
  });

  describe('delete', () => {
    it('should return 200 and success message on cancellation', async () => {
      req.params.id = '1';
      const mockCancelled = { id: BigInt(1), status: 'cancelled' };
      WorkshopService.cancelWorkshop.mockResolvedValue(mockCancelled);

      await WorkshopController.delete(req, res);

      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          id: '1',
          message: 'Workshop cancelled successfully'
        }
      });
      expect(WorkshopService.cancelWorkshop).toHaveBeenCalledWith('1');
    });

    it('should return 500 status code on general cancellation failure', async () => {
      req.params.id = '1';
      WorkshopService.cancelWorkshop.mockRejectedValue(new Error('DB Error'));

      await WorkshopController.delete(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: 'DB Error'
        })
      );
    });
  });
});
