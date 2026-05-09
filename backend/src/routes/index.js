const { Router } = require('express');
const healthRoutes = require('./health.routes');

const router = Router();

router.use(healthRoutes);
router.use('/workshops', require('./registrationRoutes'));

module.exports = router;
