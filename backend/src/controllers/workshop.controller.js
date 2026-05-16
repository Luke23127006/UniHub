const WorkshopService = require('../services/workshop.service');

class WorkshopController {
  static async list(req, res) {
    try {
      console.log('[WorkshopController] Fetching workshop list...', req.query);
      const { limit, offset, status } = req.query;
      const result = await WorkshopService.listWorkshops({ limit, offset, status });
      console.log(`[WorkshopController] Successfully fetched ${result.data.length} workshops.`);
      
      res.json({
        status: 'success',
        data: result
      });
    } catch (error) {
      console.error('[WorkshopController] Error listing workshops:', error);
      res.status(500).json({
        status: 'error',
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message
        }
      });
    }
  }

  static async getById(req, res) {
    try {
      const { id } = req.params;
      const workshop = await WorkshopService.getWorkshopById(id);
      
      if (!workshop) {
        return res.status(404).json({
          status: 'error',
          error: {
            code: 'NOT_FOUND',
            message: 'Workshop not found'
          }
        });
      }

      res.json({
        status: 'success',
        data: workshop
      });
    } catch (error) {
      console.error(`[WorkshopController] Error getting workshop ${req.params.id}:`, error);
      res.status(500).json({
        status: 'error',
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message
        }
      });
    }
  }

  /**
   * Manual trigger for AI summary processing (useful for testing)
   */
  static async triggerAiSummary(req, res) {
    try {
      const { id } = req.params;
      const { fileName, storagePath } = req.body;
      const userId = req.user.id; // From verifyToken

      if (!storagePath) {
        return res.status(400).json({
          status: 'error',
          message: 'storagePath is required'
        });
      }

      const result = await WorkshopService.addDocumentAndTriggerSummary({
        workshopId: id,
        fileName: fileName || 'manual_trigger.pdf',
        storagePath: storagePath,
        fileSize: 0,
        userId: userId
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
      console.error('[WorkshopController] Error triggering AI summary:', error);
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }
}

module.exports = WorkshopController;
