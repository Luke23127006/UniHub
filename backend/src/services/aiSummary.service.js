const prisma = require('../config/db');

class AiSummaryService {
  /**
   * Updates an AI summary record with results from the worker.
   * @param {string} id - AiSummary ID
   * @param {object} data - { status, raw_text, summary_text, last_error }
   */
  static async updateSummary(id, data) {
    const { status, raw_text, summary_text, last_error } = data;

    return prisma.aiSummary.update({
      where: { id: BigInt(id) },
      data: {
        status,
        raw_text,
        summary_text,
        last_error,
        completed_at: status === 'completed' ? new Date() : null
      }
    });
  }
}

module.exports = AiSummaryService;
