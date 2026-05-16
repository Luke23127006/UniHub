const AiSummaryService = require('../services/aiSummary.service');

class AiSummaryController {
  /**
   * Internal endpoint for AI Worker to update summary results.
   * PATCH /api/ai/internal/summaries/:id
   */
  static async updateSummary(req, res) {
    try {
      const { id } = req.params;
      const { status, raw_text, summary_text, last_error } = req.body;

      console.log(`[AiSummaryController] Received update for summary ${id}: status=${status}`);

      const summary = await AiSummaryService.updateSummary(id, {
        status,
        raw_text,
        summary_text,
        last_error
      });

      res.json({
        status: 'success',
        data: {
          id: summary.id.toString(),
          status: summary.status
        }
      });
    } catch (error) {
      console.error('[AiSummaryController] Error updating AI summary:', error);
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }
}

module.exports = AiSummaryController;
