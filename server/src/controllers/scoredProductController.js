// server/src/controllers/scoredProductController.js
const ScoredProduct = require('../models/ScoredProduct');
const User = require('../models/User'); // Optional: if you need to interact with User model directly, though user ID comes from req.user

// @desc    Save a new scored product analysis
// @route   POST /api/scored-products
// @access  Private
exports.saveScoredProduct = async (req, res) => {
    console.log("Attempting to save scored product for user:", req.user.id); // req.user is set by authMiddleware
    try {
        const {
            // Product Info (ensure these align with what frontend will send, which should be a combo of lookup + score results)
            asin, title, imageUrl, category, sellingPrice, bsr, fbaSellers,
            weight, dimensions, isApparel, variationsCount, // This might be variationsCountInput from user
            brand,
            
            // User Inputs at time of scoring (from req.body sent to /score)
            costPrice, advertisingCostPerUnit, delicacyRating, 
            // variationsCountInput, // Use 'variationsCount' from main body as the input value for 'variationsCountInput' field in schema
            seasonality, amazonSells, salesTrend, inboundPlacementOption,
            isDangerousGood, estimatedSalesPerMonth, estimatedTimeToSale,
            supplierDiscountRebate,

            // Results from calculateScore
            score, calculatedRoi, calculatedNetProfit, estimatedFees,
            estimatedMonthlyStorageCost, determinedSizeTier, warnings,
            explanation,
            
            notes // Optional User Notes
        } = req.body;

        // Basic validation for absolutely essential fields for saving
        if (!title || costPrice === undefined || score === undefined) {
            return res.status(400).json({ message: 'Missing required fields (e.g., title, costPrice, score) to save product analysis.' });
        }

        const newScoredProductData = {
            user: req.user.id, // From authMiddleware
            asin: asin || null,
            title,
            imageUrl: imageUrl || null,
            category: category || 'Unknown',
            sellingPrice: sellingPrice !== undefined ? parseFloat(sellingPrice) : null,
            bsr: bsr !== undefined ? parseInt(bsr) : null,
            fbaSellers: fbaSellers !== undefined ? parseInt(fbaSellers) : null,
            weight: weight !== undefined ? parseFloat(weight) : null,
            dimensions: dimensions || {}, // Ensure dimensions is an object, even if empty
            isApparel: !!isApparel, // Convert to boolean
            variationsCountFetched: variationsCount !== undefined ? parseInt(variationsCount) : 1, // Assuming 'variationsCount' from body is the one to save
            brand: brand || null,
            
            costPrice: parseFloat(costPrice),
            advertisingCostPerUnit: parseFloat(advertisingCostPerUnit) || 0,
            delicacyRating: parseInt(delicacyRating) || 3,
            variationsCountInput: parseInt(variationsCount) || 1, // Storing the 'variationsCount' from body as 'variationsCountInput' in schema
            seasonality: !!seasonality,
            amazonSells: !!amazonSells,
            salesTrend: salesTrend || 'Stable',
            inboundPlacementOption: inboundPlacementOption || 'Optimized',
            isDangerousGood: !!isDangerousGood,
            estimatedSalesPerMonth: estimatedSalesPerMonth !== null ? parseInt(estimatedSalesPerMonth) : null,
            estimatedTimeToSale: estimatedTimeToSale !== null ? parseInt(estimatedTimeToSale) : null,
            supplierDiscountRebate: parseFloat(supplierDiscountRebate) || 0,
            
            score: parseFloat(score),
            calculatedRoi: calculatedRoi !== undefined ? parseFloat(calculatedRoi) : null,
            calculatedNetProfit: calculatedNetProfit !== undefined ? parseFloat(calculatedNetProfit) : null,
            estimatedFees: estimatedFees !== undefined ? parseFloat(estimatedFees) : null,
            estimatedMonthlyStorageCost: estimatedMonthlyStorageCost !== undefined ? parseFloat(estimatedMonthlyStorageCost) : null,
            determinedSizeTier: determinedSizeTier || 'Unknown',
            warnings: warnings || [],
            explanation: explanation || '',
            notes: notes || ''
        };
        
        const newScoredProduct = new ScoredProduct(newScoredProductData);
        const savedProduct = await newScoredProduct.save();
        
        console.log("Scored product saved successfully:", savedProduct._id);
        res.status(201).json({
            message: 'Product analysis saved successfully!',
            data: savedProduct
        });

    } catch (error) {
        console.error('Error saving scored product:', error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ message: 'Validation Error saving product.', errors: messages });
        }
        res.status(500).json({ message: 'Server error while saving product analysis.' });
    }
};

// @desc    Get all scored products for the logged-in user
// @route   GET /api/scored-products
// @access  Private
exports.getScoredProducts = async (req, res) => {
    console.log("Fetching scored products for user:", req.user.id);
    try {
        const scoredProducts = await ScoredProduct.find({ user: req.user.id })
            .sort({ createdAt: -1 }); // Sort by newest first

        res.status(200).json({
            message: 'Fetched saved products successfully!',
            count: scoredProducts.length,
            data: scoredProducts
        });

    } catch (error) {
        console.error('Error fetching scored products:', error);
        res.status(500).json({ message: 'Server error while fetching saved products.' });
    }
};

// @desc    Delete a specific scored product
// @route   DELETE /api/scored-products/:id
// @access  Private
exports.deleteScoredProduct = async (req, res) => {
    const productId = req.params.id;
    console.log("Attempting to delete scored product ID:", productId, "for user:", req.user.id);
    try {
        // Validate if the ID is a valid MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({ message: 'Invalid product ID format.' });
        }

        const product = await ScoredProduct.findById(productId);

        if (!product) {
            return res.status(404).json({ message: 'Saved product not found.' });
        }

        // Ensure the product belongs to the logged-in user
        if (product.user.toString() !== req.user.id) {
            return res.status(401).json({ message: 'User not authorized to delete this product.' });
        }

        await product.deleteOne(); // Mongoose v6+ uses document.deleteOne()
        // For older Mongoose: await ScoredProduct.findByIdAndDelete(req.params.id);

        console.log("Scored product deleted successfully:", productId);
        res.status(200).json({ message: 'Saved product deleted successfully.' });

    } catch (error) {
        console.error('Error deleting scored product:', error);
        // Catch CastError specifically if findById fails due to invalid ID format,
        // though the explicit check above should catch most of these.
        if (error.name === 'CastError') { 
            return res.status(400).json({ message: 'Invalid product ID format (CastError).' });
        }
        res.status(500).json({ message: 'Server error while deleting product.' });
    }
};