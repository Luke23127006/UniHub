const { Router } = require('express');
const authRoutes = require('./authRoutes');
const healthRoutes = require('./health.routes');
const workshopRoutes = require('./workshopRoutes');
const registrationRoutes = require('./registrationRoutes');
const ticketRoutes = require('./ticketRoutes');
const checkinRoutes = require('./checkinRoutes');
const paymentRoutes = require('./paymentRoutes');

const router = Router();

router.use('/auth', authRoutes);
router.use(healthRoutes);
router.use('/workshops', require('./registrationRoutes'));

module.exports = router;
