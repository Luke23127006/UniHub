const AiSummaryService = require('../services/aiSummary.service');

class AiSummaryController {
  /**
   * Manual trigger for AI summary processing (Admin only)
   * POST /api/ai/workshops/:id/summarize
   */
  static async requestSummary(req, res) {
    try {
      const { id } = req.params;
      const { fileName, storagePath } = req.body;

      if (!req.user || !req.user.sub) {
        return res.status(401).json({
          status: 'error',
          message: 'Unauthorized: User ID missing'
        });
      }
      const userId = req.user.sub;

      if (!storagePath) {
        return res.status(400).json({
          status: 'error',
          message: 'storagePath is required'
        });
      }

      const result = await AiSummaryService.triggerSummary({
        workshopId: id,
        fileName: fileName || 'manual_trigger.pdf',
        storagePath,
        fileSize: 0,
        userId
      });

      res.json({
        status: 'success',
        message: 'AI summary task triggered successfully',
        data: {
          summaryId: result.summary.id.toString(),
          status: result.summary.status
        }
      });
    } catch (error) {
      console.error('[AiSummaryController] Error requesting summary:', error);
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }

  /**
   * Internal endpoint for AI Worker to update summary results.
   * PATCH /api/v1/ai/internal/ai-summaries/:id
   */
  static async updateSummary(req, res) {
    try {
      const { id } = req.params;
      const { status, raw_text, summary_text, suggested_title, speaker_name, last_error } = req.body;

      console.log(`[AiSummaryController] Received update for summary ${id}: status=${status}`);

      const summary = await AiSummaryService.updateSummary(id, {
        status,
        raw_text,
        summary_text,
        suggested_title,
        speaker_name,
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

  /**
   * Internal endpoint for AI Worker to update temporary PDF analysis jobs.
   * PATCH /api/v1/ai/internal/jobs/:jobId
   */
  static async updateJobStatus(req, res) {
    try {
      const { jobId } = req.params;
      const data = req.body;

      console.log(`[AiSummaryController] Received update for job ${jobId}: status=${data.status}`);

      const updated = await AiSummaryService.updateJobStatus(jobId, data);

      if (!updated) {
        return res.status(404).json({
          status: 'error',
          message: 'Job not found'
        });
      }

      res.json({
        status: 'success',
        data: updated
      });
    } catch (error) {
      console.error('[AiSummaryController] Error updating job status:', error);
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }
}

module.exports = AiSummaryController;
