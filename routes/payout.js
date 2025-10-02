// routes/withdrawalSettings.js
const express = require('express');
const router = express.Router();
const {
  createWithdrawalSetting,
  listWithdrawalSettings,
  updateWithdrawalSetting,
  deleteWithdrawalSetting,
} = require('../controllers/user');

// Require auth middleware that sets req.user.sub
const requireAuth = require('../middleware/requireAuth');

router.use(requireAuth);

// GET /api/payout/settings?method=all|3|5|8
router.get('/api/payout/settings', listWithdrawalSettings);

// POST /api/payout/settings
router.post('/api/payout/settings', createWithdrawalSetting);

// PUT /api/payout/settings/:id
router.put('/api/payout/settings/:id', updateWithdrawalSetting);

// DELETE /api/payout/settings/:id
router.delete('/api/payout/settings/:id', deleteWithdrawalSetting);

module.exports = router;
