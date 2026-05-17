const WorkshopService = require('../services/workshop.service');
const AiSummaryService = require('../services/aiSummary.service');
const prisma = require('../config/db');
const { addClient, removeClient } = require('../config/sseManager');

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

  static async create(req, res) {
    try {
      if (!req.user || !req.user.sub) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
      }
      const newWorkshop = await WorkshopService.createWorkshop(req.body, req.user.sub);
      res.json({
        status: 'success',
        data: {
          id: newWorkshop.id.toString(),
          message: 'Workshop created successfully'
        }
      });
    } catch (error) {
      console.error('[WorkshopController] Error creating workshop:', error);
      res.status(500).json({
        status: 'error',
        message: error.message
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

  static async uploadPdfAsync(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          status: 'error',
          message: 'No PDF file uploaded'
        });
      }

      const filePath = req.file.path;
      const jobId = await AiSummaryService.triggerPdfAnalysis(filePath);

      res.json({
        status: 'success',
        data: {
          jobId,
          storagePath: filePath
        }
      });
    } catch (error) {
      console.error('[WorkshopController] Error starting PDF analysis:', error);
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }

  static async getPdfJobStatus(req, res) {
    try {
      const { jobId } = req.params;
      const status = await AiSummaryService.getJobStatus(jobId);

      if (!status) {
        return res.status(404).json({
          status: 'error',
          message: 'Job not found or expired'
        });
      }

      res.json({
        status: 'success',
        data: status
      });
    } catch (error) {
      console.error('[WorkshopController] Error checking PDF job status:', error);
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }

  static async update(req, res) {
    try {
      if (!req.user || !req.user.sub) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
      }
      const { id } = req.params;
      const updatedWorkshop = await WorkshopService.updateWorkshop(id, req.body, req.user.sub);
      res.json({
        status: 'success',
        data: {
          id: updatedWorkshop.id.toString(),
          message: 'Workshop updated successfully'
        }
      });
    } catch (error) {
      console.error(`[WorkshopController] Error updating workshop ${req.params.id}:`, error);
      res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.message
      });
    }
  }

  static async delete(req, res) {
    try {
      const { id } = req.params;
      const cancelledWorkshop = await WorkshopService.cancelWorkshop(id);
      res.json({
        status: 'success',
        data: {
          id: cancelledWorkshop.id.toString(),
          message: 'Workshop cancelled successfully'
        }
      });
    } catch (error) {
      console.error(`[WorkshopController] Error deleting/cancelling workshop ${req.params.id}:`, error);
      res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.message
      });
    }
  }

  static async listRooms(req, res) {
    try {
      const rooms = await prisma.room.findMany({
        where: { is_active: true },
        select: { id: true, room_code: true, name: true, capacity: true }
      });
      res.json({
        status: 'success',
        data: rooms
      });
    } catch (error) {
      console.error('[WorkshopController] Error listing rooms:', error);
      res.status(500).json({ status: 'error', message: error.message });
    }
  }

  static seatUpdatesSSE(req, res) {
    res.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.flushHeaders();
    res.write(': connected\n\n');

    addClient(res);

    const heartbeat = setInterval(() => {
      try { res.write(': ping\n\n'); } catch { /* client gone */ }
    }, 25000);

    req.on('close', () => {
      clearInterval(heartbeat);
      removeClient(res);
    });
  }

  static async listSpeakers(req, res) {
    try {
      const speakers = await prisma.speaker.findMany({
        select: { id: true, full_name: true, title: true, organization: true }
      });
      res.json({
        status: 'success',
        data: speakers
      });
    } catch (error) {
      console.error('[WorkshopController] Error listing speakers:', error);
      res.status(500).json({ status: 'error', message: error.message });
    }
  }
}

module.exports = WorkshopController;
