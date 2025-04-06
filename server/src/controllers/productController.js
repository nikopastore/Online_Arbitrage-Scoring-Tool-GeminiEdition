// server/src/controllers/productController.js

// --- calculateAmazonFees Function ---
// (Assume V10 is implemented correctly by user with Size Tiers and Verified Rates/Rules)
// Returns { totalEstimatedFees, determinedSizeTier, fbaFee }
const calculateAmazonFees = (productData) => { /* ... Accurate Fee Logic Needed Here ... */ };

// --- lookupProduct Function ---
// (Ensure placeholders include variationsCount etc.)
exports.lookupProduct = async (req, res) => { /* ... As before ... */ };


// --- Scoring Helper Functions (Normalization) --- V20 (Removed requiresAdSpend)
const normalizeROI = (roi) => { /* ... As in V19 ... */ };
const normalizeBSR = (bsr) => { /* ... As in V19 ... */ };
const normalizeCompetition = (fbaSellers) => { /* ... As in V19 ... */ };
const normalizeWeight = (fbaFee) => { /* ... As in V19 ... */ };
const normalizeTrend = (trend) => { /* ... As in V19 ... */ };
const normalizeVariationsCount = (count) => { /* ... As in V19 ... */ };
const normalizeSeasonality = (isSeasonal) => { /* ... As in V19 ... */ };
const normalizeScale5Worst = (value) => { /* ... As in V19 ... */ };


// --- calculateScore Function (Version 20 - Ad Cost Impacts ROI) ---
exports.calculateScore = async (req, res) => {
    // Destructure inputs, replaced requiresAdSpend with advertisingCostPerUnit
    const {
        // Core Metrics
        costPrice, sellingPrice, category, weight, dimensions, bsr, fbaSellers, asin, isApparel,
        // Risk/Condition
        delicacyRating = 2, // 1=Robust, 5=Fragile
        // Competition/Market
        amazonSells = false,
        // Trends/Marketing
        salesTrend = "Stable", seasonality = false, // isSeasonal?
        advertisingCostPerUnit = 0, // NEW: Optional cost input, default 0
        // Variations
        variationsCount = 1,
        // Placement Option
        inboundPlacementOption = 'Optimized',
        // Other flags
        isDangerousGood = false
        // Removed: avgSellingPrice, socialProofRating, supplierReliability, returnRate, compStrength, marketSaturation, complianceVerified, isGated, leadTime
    } = req.body;

    console.log("V20 Scoring request received.");
    let warnings = [];

    // --- Basic Validation ---
    const parsedCostPrice = parseFloat(costPrice); const parsedSellingPrice = parseFloat(sellingPrice);
    const parsedAdvertisingCost = parseFloat(advertisingCostPerUnit) || 0; // Ensure it's a number, default 0
    if (isNaN(parsedCostPrice) || parsedCostPrice <= 0) { return res.status(400).json({ message: 'Invalid Cost Price.' }); }
    if (isNaN(parsedSellingPrice) || parsedSellingPrice <= 0) { return res.status(400).json({ message: 'Invalid Selling Price.' }); }
    if (isNaN(parsedAdvertisingCost) || parsedAdvertisingCost < 0) { return res.status(400).json({ message: 'Invalid Advertising Cost.' }); }


    // --- Fee Calculation ---
    const { totalEstimatedFees: estimatedFees, determinedSizeTier, fbaFee: fulfillmentFee } = calculateAmazonFees({ /* ... Pass data ... */ });
    if (determinedSizeTier === 'Unknown') { warnings.push({ level: 'critical', metric: 'Fees/Size', message: 'Could not determine size tier. Fee calculation likely inaccurate.' }); }

    // --- Profitability Calculation (Now subtracts Ad Cost) ---
    const netProfit = parsedSellingPrice - estimatedFees - parsedCostPrice - parsedAdvertisingCost; // Subtract Ad Cost here
    const roi = (parsedCostPrice > 0) ? (netProfit / parsedCostPrice) * 100 : 0; // ROI automatically reflects ad cost now
    console.log(`Calculated - Net Profit: $${netProfit.toFixed(2)} (after $${parsedAdvertisingCost.toFixed(2)} Ad Cost), ROI: ${roi.toFixed(2)}% (Fee Est: $${estimatedFees.toFixed(2)})`);

    // --- Monthly Storage Cost Calculation ---
    let monthlyStorageCost = 0; /* ... logic ... */
    console.log(` -> Est Monthly Storage: $${monthlyStorageCost.toFixed(2)}`);

    // ===================================
    // === REVISED SCORING LOGIC ===
    // ===================================

    // --- 1. Define Weights (Removed requiresAdSpend weight, total now 106) ---
    const weights = {
        roi: 32, bsr: 22, salesTrend: 10, delicacy: 8, variationsCount: 8,
        competitionCount: 8, amazonPresence: 7, weightSize: 7, seasonality: 4,
        // Removed: requiresAdSpend: 9, avgSellingPrice: 6, socialProof: 3
    };
    const totalDefinedWeight = 106; // New total after removing weights
    console.log(`Total Defined Weight: ${totalDefinedWeight}`);

    // --- 2. Normalize Metrics & Generate Warnings ---
    const parsedBSR = parseInt(bsr); const parsedFbaSellers = parseInt(fbaSellers); const parsedWeight = parseFloat(weight); const parsedVariations = parseInt(variationsCount); const parsedDelicacy = parseInt(delicacyRating);
    const normalized = {
        roi: normalizeROI(roi), // ROI normalization now implicitly includes ad cost impact
        bsr: normalizeBSR(parsedBSR),
        competitionCount: normalizeCompetition(parsedFbaSellers),
        weightSize: normalizeWeight(fulfillmentFee),
        salesTrend: normalizeTrend(salesTrend),
        delicacy: normalizeScale5Worst(parsedDelicacy),
        variationsCount: normalizeVariationsCount(parsedVariations),
        amazonPresence: amazonSells ? 0 : 1, // Penalty still applied here
        seasonality: normalizeSeasonality(seasonality),
        // Removed requiresAdSpend normalization
    };

    // --- Generate Warnings (Updated Ad Cost Warning) ---
    /* --- USER TO DEFINE/REFINE ALL OTHER THRESHOLDS --- */
    // ROI Warnings (Critical < 15, Warn < 20) - Set
    const ROI_CRITICAL_THRESHOLD = 15; const ROI_WARNING_THRESHOLD = 20;
    if (roi < ROI_CRITICAL_THRESHOLD) { warnings.push({ level: 'critical', metric: 'ROI', message: `ROI (${roi.toFixed(1)}%) critically low (<${ROI_CRITICAL_THRESHOLD}%).` }); } else if (roi < ROI_WARNING_THRESHOLD) { warnings.push({ level: 'warning', metric: 'ROI', message: `ROI (${roi.toFixed(1)}%) low (${ROI_CRITICAL_THRESHOLD}-${ROI_WARNING_THRESHOLD}%).` }); }
    // BSR Warnings (Critical > 150k, Warn > 100k) - Set
    const BSR_CRITICAL_THRESHOLD = 150000; const BSR_WARNING_THRESHOLD = 100000;
    if (!isNaN(parsedBSR) && parsedBSR > BSR_CRITICAL_THRESHOLD) { warnings.push({ level: 'critical', metric: 'BSR', message: `BSR (${parsedBSR}) critically high (>${BSR_CRITICAL_THRESHOLD}).` }); } else if (!isNaN(parsedBSR) && parsedBSR > BSR_WARNING_THRESHOLD) { warnings.push({ level: 'warning', metric: 'BSR', message: `BSR (${parsedBSR}) high (${BSR_WARNING_THRESHOLD}-${BSR_CRITICAL_THRESHOLD}).` }); }
    // Competition Count Warnings (Critical > 18, Warn > 12) - Set
    const COMP_CRITICAL_THRESHOLD = 18; const COMP_WARNING_THRESHOLD = 12;
    if (!isNaN(parsedFbaSellers)) { if (parsedFbaSellers > COMP_CRITICAL_THRESHOLD) { warnings.push({ level: 'critical', metric: 'Competition', message: `Competition (${parsedFbaSellers} FBA) critically high (>${COMP_CRITICAL_THRESHOLD}).` }); } else if (parsedFbaSellers > COMP_WARNING_THRESHOLD) { warnings.push({ level: 'warning', metric: 'Competition', message: `Competition (${parsedFbaSellers} FBA) high (${COMP_WARNING_THRESHOLD + 1}-${COMP_CRITICAL_THRESHOLD}).` }); } else if (parsedFbaSellers === 1) { warnings.push({ level: 'warning', metric: 'Competition', message: `Only 1 FBA seller. Check PL risk.` }); } }
    // Weight/Size Warnings (Fee: Critical >= $10, Warn >= $7) - Set
    const FEE_CRITICAL_THRESHOLD = 10.00; const FEE_WARNING_THRESHOLD = 7.00;
    if (fulfillmentFee >= FEE_CRITICAL_THRESHOLD) { warnings.push({ level: 'critical', metric: 'Weight/Size', message: `FBA Fee ($${fulfillmentFee.toFixed(2)}) critically high (>= $${FEE_CRITICAL_THRESHOLD.toFixed(2)}).` }); } else if (fulfillmentFee >= FEE_WARNING_THRESHOLD) { warnings.push({ level: 'warning', metric: 'Weight/Size', message: `FBA Fee ($${fulfillmentFee.toFixed(2)}) high ($${FEE_WARNING_THRESHOLD.toFixed(2)}-$${FEE_CRITICAL_THRESHOLD.toFixed(2)}).` }); }
    // Amazon Presence Warning (Warn if true) - Set
    if (amazonSells) { warnings.push({ level: 'warning', metric: 'Amazon Competition', message: `Amazon is selling directly! Competition difficult.` }); } // Changed to warning
    // Sales Trend Warning (Warn if Declining) - Set
    if (salesTrend?.toLowerCase() === 'declining') { warnings.push({ level: 'warning', metric: 'Sales Trend', message: `Sales trend is declining.` }); }
    // Delicacy Warning (Threshold needed)
    /* --- Define Delicacy Warning Threshold --- */
    if (parsedDelicacy >= 4) { warnings.push({ level: 'warning', metric: 'Delicacy', message: `Item Delicacy rating (${parsedDelicacy}/5) is high.` }); }
    // Variations Count Warning (Threshold needed)
    /* --- Define Variations Warning Threshold --- */
    if (parsedVariations >= 7) { warnings.push({ level: 'warning', metric: 'Variations', message: `High number of variations (${parsedVariations}).` }); }
    // Seasonality Warning (Warn if true) - Set
    if (seasonality) { warnings.push({ level: 'warning', metric: 'Seasonality', message: `Product is seasonal.` }); }
    // Advertising Cost Warning (Warn if > 0) - Set
    if (parsedAdvertisingCost > 0) { warnings.push({ level: 'warning', metric: 'Advertising', message: `Includes $${parsedAdvertisingCost.toFixed(2)} Ad Cost per unit, affecting ROI.` }); }
    // Hazmat Warning (Warn if true) - Set
    if (isDangerousGood) { warnings.push({ level: 'warning', metric: 'Compliance', message: `Item flagged as Hazmat/Dangerous Good.` }); }
    // Placement Fee Warning (Warn if not Optimized) - Set
    if (inboundPlacementOption !== 'Optimized') { warnings.push({ level: 'warning', metric: 'Placement Fee', message: `Chosen '${inboundPlacementOption}' split incurs placement fees.` }); }


    // --- 3. Calculate Weighted Score ---
    let rawScore = 0;
    for (const key in weights) { if (normalized.hasOwnProperty(key) && weights[key] > 0) { rawScore += normalized[key] * weights[key]; } }
    console.log(`Raw Weighted Score: ${rawScore.toFixed(1)} (Out of ${totalDefinedWeight})`);

    // --- 4. Apply Deal Breakers ---
    let finalScore = rawScore; let dealBreakerReason = null;
    // Check critical warnings (ROI, BSR, Comp Count, Weight/Size Fee)
    const hasCriticalWarning = warnings.some(w => w.level === 'critical');
    if (hasCriticalWarning || determinedSizeTier === 'Unknown') { finalScore = Math.min(finalScore * 0.1, 5); dealBreakerReason = "Critical warning(s) or unknown size tier."; }
    if (roi < 0) { finalScore = 1; dealBreakerReason = (dealBreakerReason ? dealBreakerReason + " " : "") + "Negative ROI."; }

    // --- 5. Scale to 1-100 and Clamp ---
    finalScore = (totalDefinedWeight > 0) ? (finalScore / totalDefinedWeight) * 100 : 0;
    finalScore = Math.max(1, Math.min(100, Math.round(finalScore)));
    console.log(`Final Score (1-100): ${finalScore}`);

    // --- 6. AI Explanation Generation (Placeholder) ---
    const explanation = `(AI Placeholder - V20 AdCost) Score ${finalScore}/100. ROI ${roi.toFixed(1)}% (incl. $${parsedAdvertisingCost.toFixed(2)} ad cost)... Warnings: ${warnings.length}.`;

    // --- Response ---
    res.status(200).json({ /* ... response data ... */ });
};