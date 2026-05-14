const { Router } = require('express');
const healthRoutes = require('./health.routes');
const workshopRoutes = require('./workshopRoutes');
const ticketRoutes = require('./ticketRoutes');
const checkinRoutes = require('./checkinRoutes');

const router = Router();

router.use(healthRoutes);
router.use('/workshops', workshopRoutes);
router.use('/tickets', ticketRoutes);
router.use('/checkin', checkinRoutes);

module.exports = router;
