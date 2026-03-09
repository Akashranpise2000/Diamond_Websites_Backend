const express = require('express');
const {
  getSystemSettings,
  updateSystemSettings,
  getPublicSettings
} = require('../controllers/systemSettingsController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Public routes
router.get('/public', getPublicSettings);

// Protected routes (Admin only)
router.use(protect);
router.use(authorize('admin'));

router.get('/', getSystemSettings);
router.put('/', updateSystemSettings);

module.exports = router;