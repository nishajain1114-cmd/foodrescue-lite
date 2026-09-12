const express = require('express');
const router = express.Router();
const {
  getAdminStats,
  getAdminUsers,
  getAdminFoods,
  getAdminClaims,
  deleteFoodAdmin
} = require('../controllers/adminController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

router.use(authenticateToken, authorizeRoles('ADMIN'));

router.get('/stats', getAdminStats);
router.get('/users', getAdminUsers);
router.get('/foods', getAdminFoods);
router.get('/claims', getAdminClaims);
router.delete('/foods/:id', deleteFoodAdmin);

module.exports = router;
