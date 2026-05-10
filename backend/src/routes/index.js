const { Router } = require('express');
const healthRoutes = require('./health.routes');
const workshopRoutes = require('./workshopRoutes');
const ticketRoutes = require('./ticketRoutes');
const checkinRoutes = require('./checkinRoutes');

const router = Router();

router.use(healthRoutes);
router.use('/v1/workshops', workshopRoutes);
router.use('/v1/tickets', ticketRoutes);
router.use('/v1/checkin', checkinRoutes);

module.exports = router;
