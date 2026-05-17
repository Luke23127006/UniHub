const { Router } = require('express');
const analyticsController = require('../controllers/analytics.controller');
const verifyToken = require('../middlewares/authMiddleware');

const router = Router();

/**
 * All analytics routes require Admin privileges
 */
router.use(verifyToken);
router.use((req, res, next) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({
      status: 'error',
      error: { message: 'Forbidden: Admin access required.' },
    });
  }
  next();
});

router.get('/overview', analyticsController.getOverview);

module.exports = router;
