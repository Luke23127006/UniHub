const { Router } = require('express');
const authRoutes = require('./authRoutes');
const healthRoutes = require('./health.routes');
const workshopRoutes = require('./workshop.routes');
const aiRoutes = require('./ai.routes');
const registrationRoutes = require('./registrationRoutes');
const ticketRoutes = require('./ticketRoutes');
const checkinRoutes = require('./checkinRoutes');
const paymentRoutes = require('./paymentRoutes');
const analyticsRoutes = require('./analytics.routes');

const router = Router();

router.use('/auth', authRoutes);
router.use(healthRoutes);
router.use('/workshops', workshopRoutes);
router.use('/ai', aiRoutes);
router.use('/registrations', registrationRoutes);
router.use('/tickets', ticketRoutes);
router.use('/checkin', checkinRoutes);
router.use('/payments', paymentRoutes);
router.use('/analytics', analyticsRoutes);

module.exports = router;
