const express = require('express');
const router = express.Router();
const {
  getAllFoods,
  getFoodById,
  createFood,
  updateFood,
  deleteFood
} = require('../controllers/foodController');
const { claimFood, getFoodClaim } = require('../controllers/claimController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

// Public browsing
router.get('/', getAllFoods);
router.get('/:id', getFoodById);

// Provider actions
router.post('/', authenticateToken, authorizeRoles('PROVIDER'), createFood);
router.put('/:id', authenticateToken, authorizeRoles('PROVIDER', 'ADMIN'), updateFood);
router.delete('/:id', authenticateToken, authorizeRoles('PROVIDER', 'ADMIN'), deleteFood);

// Claim actions for food
router.post('/:id/claim', authenticateToken, authorizeRoles('RECIPIENT'), claimFood);
router.get('/:id/claim', authenticateToken, getFoodClaim);

module.exports = router;
