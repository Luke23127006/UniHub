const prisma = require('../config/db');
const { getChannel } = require('../config/rabbitmq');
const redisClient = require('../config/redis');
const crypto = require('crypto');

class AiSummaryService {
  /**
   * Adds a document to a workshop and triggers AI summary processing
   * @param {object} data - { workshopId, fileName, storagePath, fileSize, userId }
   */
  static async triggerSummary(data) {
    const { workshopId, fileName, storagePath, fileSize, userId } = data;
    const wsIdBig = BigInt(workshopId);
    const userIdBig = BigInt(userId);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create WorkshopDocument
      const doc = await tx.workshopDocument.create({
        data: {
          workshop_id: wsIdBig,
          original_file_name: fileName,
          storage_path: storagePath,
          file_size_bytes: fileSize ? BigInt(fileSize) : null,
          mime_type: 'application/pdf',
          uploaded_by: userIdBig,
          upload_status: 'uploaded'
        }
      });

      // 2. Create AiSummary record
      const summary = await tx.aiSummary.create({
        data: {
          workshop_id: wsIdBig,
          document_id: doc.id,
          status: 'pending',
          ai_model: 'gemini-1.5-flash'
        }
      });

      return { doc, summary };
    });

    // 3. Trigger RabbitMQ task
    try {
      const channel = getChannel();
      if (channel) {
        const message = {
          task_type: 'summary',
          summary_id: result.summary.id.toString(),
          file_path: storagePath,
          workshop_id: workshopId.toString()
        };

        channel.sendToQueue('ai_summary_tasks', Buffer.from(JSON.stringify(message)), {
          persistent: true
        });
        console.log(`[AiSummaryService] Published AI summary task for summary ID: ${result.summary.id}`);
      }
    } catch (err) {
      console.warn('[AiSummaryService] Failed to publish AI task to RabbitMQ:', err.message);
    }

    return result;
  }

  /**
   * Triggers a temporary PDF analysis job (used before workshop creation)
   * @param {string} filePath - Path to the uploaded PDF
   * @returns {string} jobId
   */
  static async triggerPdfAnalysis(filePath) {
    const jobId = crypto.randomUUID();
    const redisKey = `ai_job:${jobId}`;

    // Store initial status in Redis (expires in 10 minutes)
    await redisClient.set(redisKey, JSON.stringify({ status: 'pending' }), 'EX', 600);

    // Send task to RabbitMQ
    try {
      const channel = getChannel();
      if (channel) {
        const message = {
          task_type: 'analyze_pdf',
          job_id: jobId,
          file_path: filePath
        };
        channel.sendToQueue('ai_summary_tasks', Buffer.from(JSON.stringify(message)), { persistent: true });
        console.log(`[AiSummaryService] Published PDF analysis task for job ID: ${jobId}`);
      } else {
        throw new Error('RabbitMQ channel is not available');
      }
    } catch (err) {
      console.error('[AiSummaryService] Failed to publish AI task:', err);
      // Clean up Redis if task publishing fails
      await redisClient.del(redisKey);
      throw new Error('Failed to queue PDF analysis task');
    }

    return jobId;
  }

  /**
   * Gets the status of a temporary PDF analysis job
   */
  static async getJobStatus(jobId) {
    const data = await redisClient.get(`ai_job:${jobId}`);
    if (!data) return null;
    return JSON.parse(data);
  }

  /**
   * Internal webhook: Updates a job status in Redis
   */
  static async updateJobStatus(jobId, data) {
    const redisKey = `ai_job:${jobId}`;
    const existing = await redisClient.get(redisKey);
    if (!existing) return null;

    const updated = { ...JSON.parse(existing), ...data };
    // Keep it around for 1 hour after completion just in case
    await redisClient.set(redisKey, JSON.stringify(updated), 'EX', 3600);
    return updated;
  }

  /**
   * Updates an AI summary record.
   * @param {string|number} id - The ID of the summary to update.
   * @param {object} data - The data to update (status, raw_text, summary_text, last_error).
   */
  static async updateSummary(id, data) {
    const { status, raw_text, summary_text, suggested_title, speaker_name, last_error } = data;

    const updateData = {
      status,
      raw_text,
      summary_text,
      suggested_title,
      speaker_name,
      last_error,
      completed_at: status === 'completed' ? new Date() : null
    };

    return await prisma.aiSummary.update({
      where: { id: BigInt(id) },
      data: updateData
    });
  }
}

module.exports = AiSummaryService;
