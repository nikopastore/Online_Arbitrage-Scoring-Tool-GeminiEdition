// server/src/routes/scoredProductRoutes.js
const express = require('express');
const router = express.Router();
const {
    saveScoredProduct,
    getScoredProducts,
    deleteScoredProduct
} = require('../controllers/scoredProductController');
const { protect } = require('../middleware/authMiddleware'); // Your authentication middleware

// Base path for these routes will be /api/scored-products (defined in server.js)

// @route   POST /
// @desc    Save a new scored product analysis
// @access  Private
router.post('/', protect, saveScoredProduct);

// @route   GET /
// @desc    Get all scored products for the logged-in user
// @access  Private
router.get('/', protect, getScoredProducts);

// @route   DELETE /:id
// @desc    Delete a specific scored product by its database ID
// @access  Private
router.delete('/:id', protect, deleteScoredProduct);

module.exports = router;