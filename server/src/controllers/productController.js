// server/src/controllers/productController.js

// --- calculateAmazonFees Function ---
// (Assume V7+ is implemented correctly by user with Size Tiers and Verified Rates)
// Contains logic for Referral Fees, FBA Fulfillment Fees (Low-Price/Standard, Apparel/Non-Apparel)
const calculateAmazonFees = (productData) => { /* ... Accurate Fee Logic Needed Here ... */ };

// --- lookupProduct Function ---
// (Assume V7+ is implemented correctly by user - Placeholder data)
// IMPORTANT: Ensure placeholder data includes fields for variationsCount, socialProofRating, avgSellingPrice for testing
exports.lookupProduct = async (req, res) => {
    const { identifier } = req.body; if (!identifier) { return res.status(400).json({ message: 'Please provide an ASIN or UPC identifier.' }); } console.log(`Lookup requested for identifier: ${identifier}`); let placeholderProduct = null;
    // Add/update placeholders to include new fields
    if (identifier.includes('test')) { placeholderProduct = { asin: identifier, title: 'Placeholder - Echo Dot', imageUrl: 'https://via.placeholder.com/100', bsr: 1500, category: 'Electronics', sellingPrice: 49.99, avgSellingPrice: 48.50, fbaSellers: 5, weight: 0.75, dimensions: { length: 3.9, width: 3.9, height: 3.5 }, isApparel: false, variationsCount: 1, socialProofRating: 4 }; }
    // ... other placeholder examples ...
     else if (identifier.includes('apparelStd')) { placeholderProduct = { asin: identifier, title: 'Placeholder - T-Shirt Pack', imageUrl: 'https://via.placeholder.com/100', bsr: 12000, category: 'Clothing & Accessories', sellingPrice: 29.99, avgSellingPrice: 29.99, fbaSellers: 15, weight: 1.2, dimensions: { length: 14, width: 10, height: 2 }, isApparel: true, variationsCount: 12, socialProofRating: 3 }; }
     // ... add more placeholders ...
     if (placeholderProduct) { return res.status(200).json({ message: 'Product data fetched successfully (Placeholder)', product: placeholderProduct }); } else { const notFoundPlaceholder = { asin: identifier, title: 'Product Not Found (Placeholder)', bsr: null, sellingPrice: 0, avgSellingPrice: 0, category: 'Unknown', weight: 0, dimensions: { length: 0, width: 0, height: 0 }, isApparel: false, variationsCount: 1, socialProofRating: 1 }; return res.status(200).json({ message: 'Product data fetched (Placeholder - Not Found)', product: notFoundPlaceholder }); }
};


// --- Scoring Helper Functions (Normalization) --- V13

// Normalize ROI (0-1 scale) - TUNE THIS!
const normalizeROI = (roi) => { const minROI = 15; const targetROI = 100; if (roi < minROI) return 0; let score = (roi - minROI) / (targetROI - minROI); return Math.max(0, Math.min(1, score)); };
// Normalize BSR (0-1 scale, lower is better) - TUNE THIS!
const normalizeBSR = (bsr) => { if (!bsr || bsr <= 0) return 0; const maxCap = 500000; const cappedBsr = Math.min(bsr, maxCap); const logScore = Math.log10(1 + cappedBsr); const maxLogScore = Math.log10(1 + maxCap); return Math.max(0, 1 - (logScore / maxLogScore)); };
// Normalize Competition (FBA Sellers) (0-1 scale, fewer is better) - TUNE THIS!
const normalizeCompetition = (fbaSellers) => { if (fbaSellers === undefined || fbaSellers === null || fbaSellers < 0) return 0.5; const lowCompThreshold = 3; const highCompThreshold = 15; if (fbaSellers <= lowCompThreshold) return 1; if (fbaSellers >= highCompThreshold) return 0; let score = 1 - ( (fbaSellers - lowCompThreshold) / (highCompThreshold - lowCompThreshold) ); return Math.max(0, Math.min(1, score)); };
// Normalize Weight (0-1 scale, lower is better) - TUNE THIS!
const normalizeWeight = (weight) => { if (!weight || weight <= 0) return 0.5; const lightThreshold = 1.0; const heavyThreshold = 5.0; if (weight <= lightThreshold) return 1; if (weight >= heavyThreshold) return 0; let score = 1 - ( (weight - lightThreshold) / (heavyThreshold - lightThreshold) ); return Math.max(0, Math.min(1, score)); };
// Normalize a 1-5 scale (1=Worst, 5=Best -> converts to 0-1)
const normalizeScale5Best = (value) => { if (value === null || value === undefined || value < 1 || value > 5) return 0.5; return (value - 1) / 4; };
// Normalize a 1-5 scale (1=Best, 5=Worst -> converts to 0-1)
const normalizeScale5Worst = (value) => { if (value === null || value === undefined || value < 1 || value > 5) return 0.5; return 1 - ((value - 1) / 4); };
// Normalize Trend Dropdown ("Declining", "Stable", "Growing") - TUNE THIS!
const normalizeTrend = (trend) => { switch (trend?.toLowerCase()) { case 'growing': return 1.0; case 'stable': return 0.6; case 'declining': return 0.0; default: return 0.5; } };
// Normalize Seasonality Dropdown ("None", "Low", "High") - TUNE THIS!
const normalizeSeasonality = (seasonality) => { switch (seasonality?.toLowerCase()) { case 'none': return 1.0; case 'low': return 0.7; case 'high': return 0.2; default: return 0.5; } };
// Normalize Variations Count (Lower is better/simpler) - TUNE THIS!
const normalizeVariationsCount = (count) => {
    if (count === null || count === undefined || count < 1) return 0.5; // Neutral if missing
    if (count === 1) return 1.0;      // Single listing ideal
    if (count <= 3) return 0.8;       // Few variations okay
    if (count <= 6) return 0.5;       // Moderate variations neutral
    if (count <= 12) return 0.2;      // Many variations less desirable
    return 0.0;                       // Very high variation count is bad
};
// Normalize Average Selling Price (Example: higher is slightly better up to a point?) - NEEDS BETTER DEFINITION/TUNING!
const normalizeAvgSellingPrice = (price) => {
     if (!price || price <= 0) return 0;
     const lowPrice = 15;
     const highPrice = 100; // Assume less benefit above $100? TUNE THIS
     if (price <= lowPrice) return 0.1; // Low price less attractive?
     if (price >= highPrice) return 1.0;
     return 0.1 + (0.9 * (price - lowPrice) / (highPrice - lowPrice)); // Scale 0.1 to 1.0
};


// --- calculateScore Function (Version 13 - User Weights & Metrics) ---
exports.calculateScore = async (req, res) => {
    // Destructure user-defined metrics, provide defaults
    const {
        // Core Metrics
        costPrice, sellingPrice, category, weight, dimensions, bsr, fbaSellers, asin, isApparel,
        // Risk/Condition
        delicacyRating = 2, // 1=Robust, 5=Fragile
        // Competition/Market
        amazonSells = false,
        avgSellingPrice, // User provides based on research? Default to sellingPrice if missing?
        // Trends/Marketing
        salesTrend = "Stable", seasonality = "None", requiresAdSpend = false,
        // NEW Metrics
        variationsCount = 1, // Default to 1 if not provided
        socialProofRating = 3, // Default to neutral 1-5 scale
        // Other flags
        isDangerousGood = false
    } = req.body;

    console.log("V13 Scoring request received.");

    // --- Initialize Warnings ---
    let warnings = [];

    // --- Basic Validation ---
    const parsedCostPrice = parseFloat(costPrice);
    const parsedSellingPrice = parseFloat(sellingPrice);
    const parsedAvgSellingPrice = parseFloat(avgSellingPrice) || parsedSellingPrice; // Use sellingPrice if avg is missing
    if (isNaN(parsedCostPrice) || parsedCostPrice <= 0) { /* return error */ }
    if (isNaN(parsedSellingPrice) || parsedSellingPrice <= 0) { /* return error */ }

    // --- Fee Calculation ---
    const estimatedFees = calculateAmazonFees({ /* Pass relevant data */ });

    // --- Profitability Calculation ---
    const netProfit = parsedSellingPrice - estimatedFees - parsedCostPrice;
    const roi = (parsedCostPrice > 0) ? (netProfit / parsedCostPrice) * 100 : 0;
    console.log(`Calculated - Net Profit: $${netProfit.toFixed(2)}, ROI: ${roi.toFixed(2)}%`);

    // --- Monthly Storage Cost Calculation --- (Informational)
    let monthlyStorageCost = 0; /* ... logic ... */
    console.log(` -> Est Monthly Storage: $${monthlyStorageCost.toFixed(2)}`);

    // ===================================
    // === UPDATED SCORING LOGIC ===
    // ===================================

    // --- 1. Define Weights (As specified by user) ---
    const weights = {
        roi: 32,
        bsr: 22,
        salesTrend: 10,
        requiresAdSpend: 9, // Will treat normalized score of 0 (true) as penalty
        delicacy: 8,
        variationsCount: 8,
        competitionCount: 8, // FBA Sellers
        amazonPresence: 7,  // If Amazon sells
        weightSize: 7,      // Physical weight/size impact
        avgSellingPrice: 6,
        seasonality: 4,
        socialProof: 3,
        // Note: Add other factors like hazmat/DG penalty implicitly in normalization/dealbreakers if needed
    };
    const totalDefinedWeight = 124; // As specified by user
    console.log(`Total Defined Weight: ${totalDefinedWeight}`);

    // --- 2. Normalize Metrics & Generate Warnings ---
    const parsedBSR = parseInt(bsr);
    const parsedFbaSellers = parseInt(fbaSellers);
    const parsedWeight = parseFloat(weight);
    const parsedVariations = parseInt(variationsCount);
    const parsedSocialProof = parseInt(socialProofRating);
    const parsedDelicacy = parseInt(delicacyRating);

    const normalized = {
        roi: normalizeROI(roi),
        bsr: normalizeBSR(parsedBSR),
        competitionCount: normalizeCompetition(parsedFbaSellers),
        weightSize: normalizeWeight(parsedWeight),
        salesTrend: normalizeTrend(salesTrend),
        requiresAdSpend: requiresAdSpend ? 0 : 1, // 0 if TRUE (needs ads = bad), 1 if FALSE (no ads needed = good)
        delicacy: normalizeScale5Worst(parsedDelicacy), // 5=Fragile=Bad -> score 0
        variationsCount: normalizeVariationsCount(parsedVariations), // High count = bad -> score 0
        amazonPresence: amazonSells ? 0 : 1, // 0 if TRUE (Amazon sells = bad)
        avgSellingPrice: normalizeAvgSellingPrice(parsedAvgSellingPrice), // Needs refinement
        seasonality: normalizeSeasonality(seasonality), // High seasonality = lower score
        socialProof: normalizeScale5Best(parsedSocialProof), // 5=Best=Good -> score 1
    };

    // --- Generate Warnings ---
    /* --- USER INPUT NEEDED: Define/Refine Warning Thresholds --- */
    // ROI
    const ROI_CRITICAL_THRESHOLD = 15; const ROI_WARNING_THRESHOLD = 30;
    if (roi < ROI_CRITICAL_THRESHOLD) { warnings.push({ level: 'critical', metric: 'ROI', message: `ROI (${roi.toFixed(1)}%) is critically low (<${ROI_CRITICAL_THRESHOLD}%).` }); }
    else if (roi < ROI_WARNING_THRESHOLD) { warnings.push({ level: 'warning', metric: 'ROI', message: `ROI (${roi.toFixed(1)}%) is moderate (${ROI_CRITICAL_THRESHOLD}-${ROI_WARNING_THRESHOLD}%).` }); }
    // BSR
    const BSR_CRITICAL_THRESHOLD = 250000; const BSR_WARNING_THRESHOLD = 100000;
    if (!isNaN(parsedBSR) && parsedBSR > BSR_CRITICAL_THRESHOLD) { warnings.push({ level: 'critical', metric: 'BSR', message: `BSR (${parsedBSR}) is critically high (>${BSR_CRITICAL_THRESHOLD}), implies very slow sales.` }); }
    else if (!isNaN(parsedBSR) && parsedBSR > BSR_WARNING_THRESHOLD) { warnings.push({ level: 'warning', metric: 'BSR', message: `BSR (${parsedBSR}) is high (${BSR_WARNING_THRESHOLD}-${BSR_CRITICAL_THRESHOLD}), implies slow sales.` }); }
    // Competition Count
    const COMP_CRITICAL_THRESHOLD = 25; const COMP_WARNING_THRESHOLD = 15;
    if (!isNaN(parsedFbaSellers) && parsedFbaSellers > COMP_CRITICAL_THRESHOLD) { warnings.push({ level: 'critical', metric: 'Competition', message: `Competition (${parsedFbaSellers} FBA sellers) is critically high (>${COMP_CRITICAL_THRESHOLD}).` }); }
    else if (!isNaN(parsedFbaSellers) && parsedFbaSellers > COMP_WARNING_THRESHOLD) { warnings.push({ level: 'warning', metric: 'Competition', message: `Competition (${parsedFbaSellers} FBA sellers) is high (${COMP_WARNING_THRESHOLD}-${COMP_CRITICAL_THRESHOLD}).` }); }
    // Weight/Size
    const WEIGHT_CRITICAL_THRESHOLD = 10; const WEIGHT_WARNING_THRESHOLD = 5;
    if (!isNaN(parsedWeight) && parsedWeight > WEIGHT_CRITICAL_THRESHOLD) { warnings.push({ level: 'critical', metric: 'Weight', message: `Weight (${parsedWeight} lbs) is critically high (>${WEIGHT_CRITICAL_THRESHOLD} lbs), implies high fees.` }); }
    else if (!isNaN(parsedWeight) && parsedWeight > WEIGHT_WARNING_THRESHOLD) { warnings.push({ level: 'warning', metric: 'Weight', message: `Weight (${parsedWeight} lbs) is high (${WEIGHT_WARNING_THRESHOLD}-${WEIGHT_CRITICAL_THRESHOLD} lbs).` }); }
    // Sales Trend
    if (salesTrend?.toLowerCase() === 'declining') { warnings.push({ level: 'warning', metric: 'Sales Trend', message: `Sales trend is declining.` }); }
    // Advertising
    if (requiresAdSpend) { warnings.push({ level: 'warning', metric: 'Advertising', message: `Requires Ad Spend, impacting net profitability.` }); }
    // Delicacy
    if (parsedDelicacy >= 4) { warnings.push({ level: 'warning', metric: 'Delicacy', message: `Item Delicacy rating (${parsedDelicacy}/5) is high.` }); }
    // Variations Count
    const VAR_WARNING_THRESHOLD = 7; // Example
    if (parsedVariations >= VAR_WARNING_THRESHOLD) { warnings.push({ level: 'warning', metric: 'Variations', message: `High number of variations (${parsedVariations}) may add complexity.` }); }
    // Amazon Presence
    if (amazonSells) { warnings.push({ level: 'critical', metric: 'Amazon Competition', message: `Amazon is selling directly!` }); }
    // Average Selling Price (Warn if low?)
    const ASP_WARNING_THRESHOLD = 15; // Example
    if (parsedAvgSellingPrice < ASP_WARNING_THRESHOLD) { warnings.push({ level: 'warning', metric: 'Avg Selling Price', message: `Avg Selling Price ($${parsedAvgSellingPrice.toFixed(2)}) is low (<$${ASP_WARNING_THRESHOLD}). May limit absolute profit.` }); }
    // Seasonality
    if (seasonality?.toLowerCase() === 'high') { warnings.push({ level: 'warning', metric: 'Seasonality', message: `Product has high seasonality.` }); }
    // Social Proof
    if (parsedSocialProof <= 2) { warnings.push({ level: 'warning', metric: 'Social Proof', message: `Social Proof rating (${parsedSocialProof}/5) is low.` }); }
    // Hazmat
    if (isDangerousGood) { warnings.push({ level: 'warning', metric: 'Compliance', message: `Item flagged as Hazmat/Dangerous Good.` }); }


    // --- 3. Calculate Weighted Score ---
    let rawScore = 0;
    for (const key in weights) {
        if (normalized.hasOwnProperty(key) && weights[key] > 0) { // Only include factors with weight > 0
            rawScore += normalized[key] * weights[key];
        }
    }
    console.log(`Raw Weighted Score: ${rawScore.toFixed(1)} (Out of ${totalDefinedWeight})`);

    // --- 4. Apply Deal Breakers ---
    /* --- USER INPUT NEEDED: Define your hard rules --- */
    let finalScore = rawScore; // Start with raw score before scaling
    let dealBreakerReason = null;
    const hasCriticalWarning = warnings.some(w => w.level === 'critical');

    if (hasCriticalWarning) { // Example: Cap score low if any critical warning exists
        finalScore = Math.min(finalScore * 0.1, 10); // Heavily penalize, don't just rely on normalization
        console.log("Applying score penalty due to CRITICAL warning(s).");
        dealBreakerReason = warnings.filter(w => w.level === 'critical').map(w => w.metric).join(', ') + ' has critical warning.';
    }
    // Add specific overrides if needed...

    // --- 5. Scale to 1-100 and Clamp ---
    // Scale based on the total possible weight before final clamping
    finalScore = (totalDefinedWeight > 0) ? (finalScore / totalDefinedWeight) * 100 : 0;
    finalScore = Math.max(1, Math.min(100, Math.round(finalScore))); // Clamp 1-100
    console.log(`Final Score (1-100): ${finalScore}`);

    // --- 6. AI Explanation Generation (Placeholder) ---
    const explanation = `(AI Placeholder - V13 User Weights) Scored ${finalScore}/100. Influenced by ROI(${weights.roi}), BSR(${weights.bsr}), Sales Trend(${weights.salesTrend}), Competition(${weights.competitionCount}), Weight(${weights.weightSize}), etc. ${dealBreakerReason || ''} Warnings: ${warnings.length}. Est Monthly Storage $${monthlyStorageCost.toFixed(2)}.`;

    // --- Response ---
    res.status(200).json({
        message: 'Score calculated successfully',
        score: finalScore,
        explanation: explanation,
        warnings: warnings,
        calculatedRoi: roi.toFixed(1),
        calculatedNetProfit: netProfit.toFixed(2),
        estimatedFees: estimatedFees.toFixed(2),
        estimatedMonthlyStorageCost: monthlyStorageCost.toFixed(2),
    });
};