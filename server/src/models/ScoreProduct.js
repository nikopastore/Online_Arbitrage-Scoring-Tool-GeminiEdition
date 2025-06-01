// server/src/models/ScoredProduct.js
const mongoose = require('mongoose');

const scoredProductSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    // Data from lookupProduct (or manual input if API fails)
    asin: { type: String, trim: true, index: true },
    title: { type: String, trim: true, required: true },
    imageUrl: { type: String, trim: true },
    category: { type: String, trim: true },
    sellingPrice: { type: Number }, // Amazon's selling price at time of lookup
    bsr: { type: Number },
    fbaSellers: { type: Number },
    weight: { type: Number }, // Unit Weight (lbs)
    dimensions: { length: Number, width: Number, height: Number }, // Inches
    isApparel: { type: Boolean },
    variationsCountFetched: { type: Number }, // Variations count if fetched from lookup
    brand: { type: String },

    // User Inputs for calculateScore
    costPrice: { type: Number, required: true },
    advertisingCostPerUnit: { type: Number, default: 0 },
    delicacyRating: { type: Number, default: 3 },
    variationsCountInput: { type: Number, default: 1 }, // User's input for variations
    seasonality: { type: Boolean, default: false },
    amazonSells: { type: Boolean, default: false },
    salesTrend: { type: String, default: 'Stable' },
    inboundPlacementOption: { type: String, default: 'Optimized' },
    isDangerousGood: { type: Boolean, default: false },
    estimatedSalesPerMonth: { type: Number, default: null },
    estimatedTimeToSale: { type: Number, default: null },
    supplierDiscountRebate: { type: Number, default: 0 },
    
    // Results from calculateScore
    score: { type: Number, required: true },
    calculatedRoi: { type: Number },
    calculatedNetProfit: { type: Number },
    estimatedFees: { type: Number },
    estimatedMonthlyStorageCost: { type: Number },
    determinedSizeTier: { type: String },
    warnings: [{
        level: String,
        metric: String,
        message: String,
    }],
    explanation: { type: String }, // For AI explanation later

    // Optional User Notes
    notes: { type: String, trim: true, default: '' },

}, { timestamps: true }); // Adds createdAt and updatedAt

// To ensure a user cannot save the exact same ASIN multiple times IF that's desired.
// Alternatively, allow multiple saves if user wants to track changes over time.
// For now, let's assume a user might want to score the same ASIN with different inputs.
// If you want unique ASINs per user:
// scoredProductSchema.index({ user: 1, asin: 1 }, { unique: true, partialFilterExpression: { asin: { $type: "string" } } });


const ScoredProduct = mongoose.model('ScoredProduct', scoredProductSchema);

module.exports = ScoredProduct;