const { Router } = require('express');
const healthRoutes = require('./health.routes');

const router = Router();

router.use(healthRoutes);
router.use('/workshops', require('./registration.routes'));

module.exports = router;
