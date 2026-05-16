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
      }
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
});
