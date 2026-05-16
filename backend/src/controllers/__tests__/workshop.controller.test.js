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
});
