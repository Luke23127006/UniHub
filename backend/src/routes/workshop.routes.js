'use strict';

const express = require('express');
const WorkshopController = require('../controllers/workshop.controller');
const RegistrationController = require('../controllers/registrationController');
const realtimeController = require('../controllers/realtime.controller');
const authMiddleware = require('../middlewares/authMiddleware');
const { workshopRegistrationLimiter } = require('../middlewares/rateLimitMiddleware');

const router = express.Router();

// Real-time seat availability — specific paths before /:id to avoid capture
router.get('/seats/stream', realtimeController.streamSeats);
router.get('/seats/batch', realtimeController.getSeatsBatch);

// Workshop listing and detail
router.get('/', WorkshopController.getAllWorkshops);
router.get('/:id', WorkshopController.getWorkshopById);

// Registration — authenticate first so downstream middleware has a trusted user identity
router.post('/:id/register', authMiddleware, workshopRegistrationLimiter, RegistrationController.registerWorkshop);

module.exports = router;
