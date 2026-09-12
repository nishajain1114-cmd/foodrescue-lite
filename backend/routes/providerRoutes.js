const express = require('express');
const router = express.Router();
const { getProviderFoods, getProviderStats } = require('../controllers/providerController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

router.use(authenticateToken, authorizeRoles('PROVIDER'));

router.get('/foods', getProviderFoods);
router.get('/stats', getProviderStats);

module.exports = router;
