const express = require('express');
const router = express.Router();
const { getMyClaims, collectClaim } = require('../controllers/claimController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

// Recipient view their claims
router.get('/my', authenticateToken, authorizeRoles('RECIPIENT'), getMyClaims);

// Provider (or admin) marks claim as collected
router.patch('/:id/collect', authenticateToken, authorizeRoles('PROVIDER', 'ADMIN'), collectClaim);

module.exports = router;
