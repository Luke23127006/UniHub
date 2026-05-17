const AiSummaryService = require('../aiSummary.service');
const prisma = require('../../config/db');
const redisClient = require('../../config/redis');
const { getChannel } = require('../../config/rabbitmq');

// Mock Prisma
jest.mock('../../config/db', () => {
  const mockTx = {
    aiSummary: { update: jest.fn(), create: jest.fn() },
    workshopDocument: { create: jest.fn() }
  };
  return {
    ...mockTx,
    $transaction: jest.fn((cb) => cb(mockTx))
  };
});

// Mock Redis
jest.mock('../../config/redis', () => ({
  set: jest.fn(),
  get: jest.fn(),
  del: jest.fn()
}));

// Mock RabbitMQ
jest.mock('../../config/rabbitmq', () => {
  const mockChannel = {
    sendToQueue: jest.fn()
  };
  return {
    getChannel: jest.fn(() => mockChannel)
  };
});

describe('AiSummaryService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('triggerPdfAnalysis', () => {
    it('should generate a jobId, save to Redis, and publish to RabbitMQ', async () => {
      const filePath = 'test.pdf';
      const jobId = await AiSummaryService.triggerPdfAnalysis(filePath);

      expect(jobId).toBeDefined();
      expect(redisClient.set).toHaveBeenCalledWith(`ai_job:${jobId}`, expect.any(String), 'EX', 600);
      
      const channel = getChannel();
      expect(channel.sendToQueue).toHaveBeenCalledWith('ai_summary_tasks', expect.any(Buffer), { persistent: true });
    });
  });

  describe('getJobStatus', () => {
    it('should return parsed data from Redis', async () => {
      redisClient.get.mockResolvedValueOnce(JSON.stringify({ status: 'completed' }));
      const status = await AiSummaryService.getJobStatus('123');
      expect(status).toEqual({ status: 'completed' });
    });

    it('should return null if job not found', async () => {
      redisClient.get.mockResolvedValueOnce(null);
      const status = await AiSummaryService.getJobStatus('123');
      expect(status).toBeNull();
    });
  });

  describe('updateJobStatus', () => {
    it('should merge and update job status in Redis', async () => {
      redisClient.get.mockResolvedValueOnce(JSON.stringify({ status: 'pending' }));
      const updated = await AiSummaryService.updateJobStatus('123', { status: 'completed', data: 'test' });
      
      expect(updated).toEqual({ status: 'completed', data: 'test' });
      expect(redisClient.set).toHaveBeenCalledWith('ai_job:123', JSON.stringify(updated), 'EX', 3600);
    });
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
  });
});
