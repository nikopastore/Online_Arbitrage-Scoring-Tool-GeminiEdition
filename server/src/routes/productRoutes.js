// server/src/routes/productRoutes.js
const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController'); // Create this next
// Import authentication middleware later if needed: const { protect } = require('../middleware/authMiddleware');

// @route   POST /api/products/lookup
// @desc    Lookup product data from Amazon PA-API
// @access  Private (add 'protect' middleware later)
router.post('/lookup', /* protect, */ productController.lookupProduct);

// @route   POST /api/products/score
// @desc    Calculate arbitrage score for a product
// @access  Private (add 'protect' middleware later)
router.post('/score', /* protect, */ productController.calculateScore);

module.exports = router;