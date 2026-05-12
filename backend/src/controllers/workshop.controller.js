'use strict';

const WorkshopService = require('../services/workshopService');

class WorkshopController {
  static async getAllWorkshops(req, res) {
    try {
      const workshops = await WorkshopService.getAllWorkshops();
      return res.status(200).json(workshops);
    } catch (err) {
      console.error('[WorkshopController] getAllWorkshops error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async getWorkshopById(req, res) {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ message: 'Invalid workshop ID' });
    }

    try {
      const workshop = await WorkshopService.getWorkshopById(id);
      if (!workshop) {
        return res.status(404).json({ message: 'Workshop not found' });
      }
      return res.status(200).json(workshop);
    } catch (err) {
      console.error('[WorkshopController] getWorkshopById error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }
}

module.exports = WorkshopController;
