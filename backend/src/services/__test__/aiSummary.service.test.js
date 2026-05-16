const AiSummaryService = require('../aiSummary.service');
const prisma = require('../../config/db');

// Mock Prisma
jest.mock('../../config/db', () => ({
  aiSummary: {
    update: jest.fn()
  }
}));

describe('AiSummaryService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('updateSummary', () => {
    it('should update AiSummary record and return the result', async () => {
      const id = '1';
      const data = {
        status: 'completed',
        summary_text: 'Test summary',
        raw_text: 'Raw text'
      };

      const mockUpdated = {
        id: BigInt(1),
        status: 'completed',
        summary_text: 'Test summary'
      };

      prisma.aiSummary.update.mockResolvedValue(mockUpdated);

      const result = await AiSummaryService.updateSummary(id, data);

      expect(prisma.aiSummary.update).toHaveBeenCalledWith({
        where: { id: BigInt(id) },
        data: {
          status: 'completed',
          raw_text: 'Raw text',
          summary_text: 'Test summary',
          last_error: undefined,
          completed_at: expect.any(Date)
        }
      });
      expect(result).toEqual(mockUpdated);
    });

    it('should set completed_at to null if status is not completed', async () => {
      const id = '1';
      const data = {
        status: 'failed',
        last_error: 'Error'
      };

      await AiSummaryService.updateSummary(id, data);

      expect(prisma.aiSummary.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'failed',
            completed_at: null
          })
        })
      );
    });
  });
});
