const AiSummaryController = require('../aiSummary.controller');
const AiSummaryService = require('../../services/aiSummary.service');

// Mock AiSummaryService
jest.mock('../../services/aiSummary.service');

describe('AiSummaryController', () => {
  let req, res;

  beforeEach(() => {
    req = {
      params: { id: '1' },
      body: {
        status: 'completed',
        summary_text: 'Test summary',
        raw_text: 'Raw text'
      },
      user: { id: 'user-1', sub: 'user-1' }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('updateSummary', () => {
    it('should return 200 and success status when update is successful', async () => {
      const mockSummary = {
        id: BigInt(1),
        status: 'completed'
      };

      AiSummaryService.updateSummary.mockResolvedValue(mockSummary);

      await AiSummaryController.updateSummary(req, res);

      expect(AiSummaryService.updateSummary).toHaveBeenCalledWith('1', {
        status: 'completed',
        summary_text: 'Test summary',
        raw_text: 'Raw text',
        last_error: undefined
      });
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          id: '1',
          status: 'completed'
        }
      });
    });

    it('should return 500 when service fails', async () => {
      AiSummaryService.updateSummary.mockRejectedValue(new Error('Update failed'));

      await AiSummaryController.updateSummary(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Update failed'
      });
    });

    it('should handle partial updates (e.g. failure status)', async () => {
      req.body = {
        status: 'failed',
        last_error: 'Connection timeout'
      };

      const mockSummary = {
        id: BigInt(1),
        status: 'failed'
      };

      AiSummaryService.updateSummary.mockResolvedValue(mockSummary);

      await AiSummaryController.updateSummary(req, res);

      expect(AiSummaryService.updateSummary).toHaveBeenCalledWith('1', {
        status: 'failed',
        last_error: 'Connection timeout',
        raw_text: undefined,
        summary_text: undefined
      });
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          id: '1',
          status: 'failed'
        }
      });
    });
  });

  describe('requestSummary', () => {
    it('should return 200 and success status when trigger is successful', async () => {
      req.params.id = '1';
      req.body = { storagePath: 'path/to/file.pdf' };
      req.user = { id: 'user-1', sub: 'user-1' };

      const mockResult = {
        summary: { id: BigInt(1), status: 'pending' }
      };

      AiSummaryService.triggerSummary.mockResolvedValue(mockResult);

      await AiSummaryController.requestSummary(req, res);

      expect(AiSummaryService.triggerSummary).toHaveBeenCalledWith({
        workshopId: '1',
        fileName: 'manual_trigger.pdf',
        storagePath: 'path/to/file.pdf',
        fileSize: 0,
        userId: 'user-1'
      });
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'AI summary task triggered successfully',
        data: {
          summaryId: '1',
          status: 'pending'
        }
      });
    });

    it('should return 400 when storagePath is missing', async () => {
      req.body = {};
      await AiSummaryController.requestSummary(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 when service fails', async () => {
      req.body = { storagePath: 'path' };
      AiSummaryService.triggerSummary.mockRejectedValue(new Error('Trigger failed'));

      await AiSummaryController.requestSummary(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Trigger failed'
      });
    });
  });
});
