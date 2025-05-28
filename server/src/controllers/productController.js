// server/src/controllers/productController.js
const mongoose = require('mongoose');

// --- Helper Function for Fee Calculation (Version 11 - Requires User Implementation) ---
// CRITICAL: USER MUST FILL IN ALL LOGIC AND VERIFY RATES/RULES HERE
const calculateAmazonFees = (productData) => {
    const { sellingPrice = 0, category = 'Unknown', weight = 0, dimensions = { length: 0, width: 0, height: 0 }, asin, isApparel = false, isDangerousGood = false, inboundPlacementOption = 'Optimized' } = productData;
    let referralFee = 0; let fbaFee = 0; let placementFee = 0; let totalEstimatedFees = 0; let determinedSizeTier = 'Unknown';
    // --- Start of User's V20/V31 Fee Logic Structure ---
    if (sellingPrice > 0) { /* ... Referral fee logic ... */ }
    const unitWeight = parseFloat(weight) || 0; const length = parseFloat(dimensions.length) || 0; const width = parseFloat(dimensions.width) || 0; const height = parseFloat(dimensions.height) || 0;
    if (sellingPrice > 0 && unitWeight > 0 && length > 0 && width > 0 && height > 0) {
        /* --- CRITICAL USER TASK: Implement Accurate Size Tier Logic Here --- */
        // This placeholder needs to be replaced with your accurate tier determination
        // For an Echo Dot (0.66lb, ~4x4x1.7in), if your rules make it 'Large Standard', that's what will be used.
        // If your rules (from official docs) should make it 'Small Standard', implement that.
        // For testing, let's assume an Echo Dot *is* correctly determined by *your future logic* as 'Small Standard'
        // if (asin === "B07VGRJDFY") { // Example temporary override for Echo Dot testing
        // determinedSizeTier = 'Small Standard';
        // } else {
            // Placeholder tier logic from your V20 code for other items:
            const dims = [length, width, height].sort((a, b) => a - b); const shortestSide = dims[0]; const medianSide = dims[1]; const longestSide = dims[2]; const girth = 2 * (medianSide + shortestSide); const lengthPlusGirth = longestSide + girth;
            const dimWeightDivisor = 139; const dimensionalWeight = (longestSide * medianSide * shortestSide) / dimWeightDivisor; const weightForTierDet = Math.max(unitWeight, dimensionalWeight); const weightForTierDetOz = weightForTierDet * 16;
            const smallStdMaxSize = { weightOz: 16, longest: 15, median: 12, shortest: 0.75 }; const largeStdMaxSize = { weightLb: 20, longest: 18, median: 14, shortest: 8 }; const largeBulkyMaxSize = { weightLb: 50, longest: 59, median: 33, shortest: 33, lengthGirth: 130 };
            if (weightForTierDetOz <= smallStdMaxSize.weightOz && longestSide <= smallStdMaxSize.longest && medianSide <= smallStdMaxSize.median && shortestSide <= smallStdMaxSize.shortest) { determinedSizeTier = 'Small Standard'; }
            else if (weightForTierDet <= largeStdMaxSize.weightLb && longestSide <= largeStdMaxSize.longest && medianSide <= largeStdMaxSize.median && shortestSide <= largeStdMaxSize.shortest) { determinedSizeTier = 'Large Standard'; }
            else if (weightForTierDet <= largeBulkyMaxSize.weightLb && longestSide <= largeBulkyMaxSize.longest && medianSide <= largeBulkyMaxSize.median && shortestSide <= largeBulkyMaxSize.shortest && lengthPlusGirth <= largeBulkyMaxSize.lengthGirth) { determinedSizeTier = 'Large Bulky'; }
            else if (longestSide > 59 || medianSide > 33 || shortestSide > 33 || lengthPlusGirth > 130 || weightForTierDet > 50) {
                 if (weightForTierDet <= 50) { determinedSizeTier = 'Extra-large 0-50lb'; } else if (weightForTierDet <= 70) { determinedSizeTier = 'Extra-large 50-70lb'; } else if (weightForTierDet <= 150) { determinedSizeTier = 'Extra-large 70-150lb'; } else { determinedSizeTier = 'Extra-large 150+lb'; }
            } else { determinedSizeTier = 'Unknown'; }
        // }
        /* --- CRITICAL USER TASK: Implement Accurate Fee Lookups Here --- */
        fbaFee = 6.50; // Placeholder
    }
    totalEstimatedFees = referralFee + fbaFee + placementFee;
    console.log(` -> Determined Size Tier (in calculateAmazonFees): ${determinedSizeTier}`);
    console.log(` -> Total Estimated Fees: $${totalEstimatedFees.toFixed(2)}`);
    return { totalEstimatedFees, determinedSizeTier, fbaFee };
};
// --- End calculateAmazonFees Function ---


// --- lookupProduct Function ---
exports.lookupProduct = async (req, res) => { /* ... Placeholder logic from V32 ... */ };


// --- Scoring Helper Functions (Normalization) --- V33

const normalizeROI = (roi) => { /* ... As in V32 ... */ };
const normalizeBSR = (bsr) => { /* ... As in V32 ... */ };
const normalizeCompetition = (fbaSellers) => { /* ... As in V32 ... */ };
const normalizeTrend = (trend) => { /* ... As in V32 ... */ };
const normalizeVariationsCount = (count) => { /* ... As in V32 ... */ };
const normalizeSeasonality = (isSeasonal) => { /* ... As in V32 ... */ };
const normalizeScale5Best = (value) => { /* ... As in V32 ... */ }; // For Delicacy

// *** UPDATED Weight Normalization - Softer mid-range penalties ***
// *** USER TO REVIEW/TUNE RETURN VALUES (0.0 to 1.0) FOR EACH STEP ***
const normalizeWeight = (unitWeight) => {
    console.log(`--- Normalizing Weight: ${unitWeight} lbs ---`);
    let score;
    if (unitWeight === null || unitWeight === undefined || unitWeight <= 0) { score = 0.5; console.log("Weight Score: 0.5 (Unknown)"); }
    else if (unitWeight > 50) { score = 0.0; console.log("Weight Score: 0.0 (>50lb Crit)"); } // Critical penalty applied in deal breaker
    else if (unitWeight <= 1) { score = 1.0; console.log("Weight Score: 1.0 (<=1lb)"); }    // Best
    else if (unitWeight <= 3) { score = 0.9; console.log("Weight Score: 0.9 (1-3lb)"); }    // Was 0.75 for 1-2, 0.6 for 2-3. Now 0.9 for 1-3.
    else if (unitWeight <= 5) { score = 0.8; console.log("Weight Score: 0.8 (3-5lb)"); }    // Was 0.5
    else if (unitWeight <= 10) { score = 0.7; console.log("Weight Score: 0.7 (5-10lb)"); }  // Was 0.35
    else if (unitWeight <= 15) { score = 0.6; console.log("Weight Score: 0.6 (10-15lb)"); } // Was 0.15
    else if (unitWeight <= 20) { score = 0.5; console.log("Weight Score: 0.5 (15-20lb)"); } // Was 0.10 (Now neutral)
    // Gradual drop 20-50lb, less punitive
    else { // Weight is > 20 and <= 50
        const score_at_20 = 0.5; const score_at_50 = 0.1; // Ends higher than before
        score = score_at_20 - ((unitWeight - 20) * (score_at_20 - score_at_50) / (50 - 20));
        score = Math.max(score_at_50, score);
        console.log(`Weight Score: ${score.toFixed(2)} (20-50lb range)`);
    }
    return score;
};

// *** UPDATED Dimension Normalization - Softer mid-range penalties ***
// *** USER TO REVIEW/TUNE RETURN VALUES (0.0 to 1.0) FOR EACH STEP ***
const normalizeDimensions = (determinedSizeTier) => {
    console.log(`--- Normalizing Dimensions based on Tier: ${determinedSizeTier} ---`);
    let score = 0.5; // Default/Unknown
    // These scores are higher (less penalty) than V31/V32
    switch (determinedSizeTier) {
        case 'Small Standard': score = 1.0; break;     // Best
        case 'Large Standard': score = 0.8; break;     // Was 0.7
        case 'Large Bulky': score = 0.6; break;        // Was 0.4 (Covers items up to ~4-5ft if not too heavy)
        case 'Extra-large 0-50lb': score = 0.4; break;    // Was 0.2
        case 'Extra-large 50-70lb': score = 0.3; break;   // Was 0.15
        case 'Extra-large 70-150lb': score = 0.2; break;  // Was 0.1
        case 'Extra-large 150+lb': score = 0.1; break; // Was 0.05
        case 'Unknown': score = 0.5; break;
        default: score = 0.5;
    }
    console.log(`Dimension Score (0-1): ${score.toFixed(2)}`);
    return score;
};


// --- calculateScore Function (Version 33 - Using updated Wt/Dim normalizations) ---
exports.calculateScore = async (req, res) => {
    console.log("V33 Scoring request received (Adjusted Wt/Dim Norm).");
    try {
        // Destructure inputs (Matches V32)
        const { costPrice, sellingPrice, category, weight, dimensions, bsr, fbaSellers, asin, isApparel, delicacyRating = 2, amazonSells = false, salesTrend = "Stable", seasonality = false, advertisingCostPerUnit = 0, variationsCount = 1, inboundPlacementOption = 'Optimized', isDangerousGood = false } = req.body;
        let warnings = [];

        // --- Basic Validation ---
        // console.log("--- Step 0: Basic Validation ---");
        const parsedCostPrice = parseFloat(costPrice); const parsedSellingPrice = parseFloat(sellingPrice); const parsedAdvertisingCost = parseFloat(advertisingCostPerUnit) || 0;
        if (isNaN(parsedCostPrice) || parsedCostPrice <= 0) { return res.status(400).json({ message: 'Invalid Cost Price.' }); } if (isNaN(parsedSellingPrice) || parsedSellingPrice <= 0) { return res.status(400).json({ message: 'Invalid Selling Price.' }); } if (isNaN(parsedAdvertisingCost) || parsedAdvertisingCost < 0) { return res.status(400).json({ message: 'Invalid Advertising Cost.' }); }
        // console.log("--- Step 0: Validation Passed ---");

        // --- Fee Calculation (Wrapped in try-catch) ---
        // console.log("--- Step 1: Fee Calculation ---");
        let estimatedFees = 0; let determinedSizeTier = 'Unknown'; let fulfillmentFee = 0;
        try {
            const feeResult = calculateAmazonFees({ sellingPrice: parsedSellingPrice, category, weight: parseFloat(weight) || 0, dimensions, asin, isApparel: !!isApparel, isDangerousGood: !!isDangerousGood, inboundPlacementOption });
            if (feeResult && typeof feeResult === 'object' && feeResult.hasOwnProperty('totalEstimatedFees')) {
                 estimatedFees = feeResult.totalEstimatedFees; determinedSizeTier = feeResult.determinedSizeTier; fulfillmentFee = feeResult.fbaFee;
                 if (determinedSizeTier === 'Unknown') { warnings.push({ level: 'critical', metric: 'Fees/Size', message: 'Could not determine size tier. Fee & Dimension scoring inaccurate.' }); }
            } else { console.error("!!! calculateAmazonFees returned unexpected value:", feeResult); warnings.push({ level: 'critical', metric: 'Fees', message: 'Internal error during fee calculation (unexpected return).' }); determinedSizeTier = 'Unknown'; estimatedFees = 0; fulfillmentFee = 0; }
        } catch (error) { console.error("!!! Error occurred INSIDE calculateAmazonFees:", error); warnings.push({ level: 'critical', metric: 'Fees', message: `Internal error during fee calculation: ${error.message}` }); determinedSizeTier = 'Unknown'; estimatedFees = 0; fulfillmentFee = 0; }
        console.log(`--- Step 1: Fees processed - Tier: ${determinedSizeTier}, FulfillFee: ${fulfillmentFee}, TotalFees: ${estimatedFees}`);

        // --- Profitability Calculation ---
        // console.log("--- Step 2: Profitability Calculation ---");
        const netProfit = parsedSellingPrice - estimatedFees - parsedCostPrice - parsedAdvertisingCost;
        const roi = (parsedCostPrice > 0) ? (netProfit / parsedCostPrice) * 100 : 0;
        console.log(` -> Profit: $${netProfit.toFixed(2)}, ROI: ${roi.toFixed(2)}%`);

        // --- Monthly Storage Cost Calculation ---
        // console.log("--- Step 3: Storage Cost Calculation ---");
        let monthlyStorageCost = 0; /* ... logic using determinedSizeTier ... */
        // console.log(` -> Est Monthly Storage: $${monthlyStorageCost.toFixed(2)}`);

        // ===================================
        // === SCORING LOGIC ===
        // ===================================
        // console.log("--- Step 4: Normalization ---");
        const weights = { roi: 32, bsr: 22, salesTrend: 10, delicacy: 8, variationsCount: 8, competitionCount: 8, amazonPresence: 7, weight: 4, dimensions: 3, seasonality: 4, };
        const totalDefinedWeight = 106;

        const parsedBSR = parseInt(bsr); const parsedFbaSellers = parseInt(fbaSellers);
        const parsedWeight = parseFloat(weight) || 0;
        const parsedVariations = parseInt(variationsCount) || 1;
        const parsedDelicacy = parseInt(delicacyRating);

        const normalized = {
            roi: normalizeROI(roi), bsr: normalizeBSR(parsedBSR), competitionCount: normalizeCompetition(parsedFbaSellers),
            weight: normalizeWeight(parsedWeight), // *** Uses UPDATED normalizeWeight ***
            dimensions: normalizeDimensions(determinedSizeTier), // *** Uses UPDATED normalizeDimensions ***
            salesTrend: normalizeTrend(salesTrend), delicacy: normalizeScale5Best(parsedDelicacy),
            variationsCount: normalizeVariationsCount(parsedVariations), amazonPresence: amazonSells ? 0 : 1, seasonality: normalizeSeasonality(seasonality),
        };
        // console.log(` -> Normalized Values: ${JSON.stringify(normalized, (k,v) => typeof v === 'number' ? v.toFixed(3) : v)}`);
        console.log(`--- DEBUG --- Input Weight: ${parsedWeight}, Normalized Weight Score: ${normalized.weight?.toFixed(2)}`);
        console.log(`--- DEBUG --- Determined Size Tier: ${determinedSizeTier}, Normalized Dimension Score: ${normalized.dimensions?.toFixed(2)}`);
        // console.log(`--- DEBUG --- Input Variations: ${parsedVariations}, Normalized Variations Score: ${normalized.variationsCount?.toFixed(2)}`);

        // --- Generate Warnings ---
        // console.log("--- Step 5: Generating Warnings ---");
        // *** CORRECTED Dimension Warning Logic ***
        if (!['Small Standard', 'Large Standard', 'Unknown'].includes(determinedSizeTier)) {
            warnings.push({ level: 'warning', metric: 'Dimensions', message: `Item size tier is ${determinedSizeTier}. Check fee/handling impact.` });
        }
        // ... (Other warning logic blocks remain the same as V32) ...
        // console.log(` -> Generated ${warnings.length} warnings.`);

        // --- Calculate Weighted Score ---
        // console.log("--- Step 6: Calculating Weighted Score ---");
        let rawScore = 0;
        for (const key in weights) { if (normalized.hasOwnProperty(key) && weights.hasOwnProperty(key) && weights[key] > 0) { if (typeof normalized[key] === 'number' && !isNaN(normalized[key])) { rawScore += normalized[key] * weights[key]; } else { console.warn(`Warning: Norm value for '${key}' NaN/invalid.`); } } else if (weights.hasOwnProperty(key) && weights[key] > 0) { console.warn(`Warning: Norm value missing for '${key}'.`); } }
        console.log(` -> Raw Weighted Score: ${rawScore.toFixed(1)} (Out of ${totalDefinedWeight})`);

        // --- Apply Deal Breakers ---
        // console.log("--- Step 7: Applying Deal Breakers ---");
        let finalScore = rawScore; let dealBreakerReason = null;
        const WEIGHT_CRITICAL_THRESHOLD = 50; // Defined for clarity in deal breaker
        const hasCriticalWarning = warnings.some(w => w.level === 'critical');
        // The impact of weight > 50lb and Unknown Tier is already handled by generating a critical warning.
        // So, we just check hasCriticalWarning.
        if (hasCriticalWarning) {
            finalScore = Math.min(finalScore * 0.1, 5);
            dealBreakerReason = "Critical warning(s) present.";
        }
        // If ROI is very good, it should *not* be overridden by a moderate size/weight *unless* that size/weight triggers a CRITICAL warning.
        // The current critical weight warning is > 50lbs. Large Standard or Large Bulky are NOT critical warnings based on tier alone.
        if (roi < 0) { finalScore = 1; dealBreakerReason = (dealBreakerReason ? dealBreakerReason + " " : "") + "Negative ROI."; }
        // console.log(` -> Score after deal breakers: ${finalScore.toFixed(1)}`);

        // --- Scale to 1-100 and Clamp ---
        // console.log("--- Step 8: Scaling and Clamping Score ---");
        finalScore = (totalDefinedWeight > 0) ? (finalScore / totalDefinedWeight) * 100 : 0;
        if (isNaN(finalScore)) { console.error("!!! Final Score is NaN before clamping!"); finalScore = 1; warnings.push({ level: 'critical', metric: 'Score', message: 'Internal calculation error resulted in invalid score.' }); }
        finalScore = Math.max(1, Math.min(100, Math.round(finalScore)));
        console.log(`Final Score (1-100): ${finalScore}`);

        const explanation = `(AI Placeholder - V33 Adjusted Wt/Dim Scoring) Score ${finalScore}/100...`;
        // console.log("--- Step 9: Preparing Response Data ---");
        const responseData = { message: 'Score calculated successfully', score: finalScore, explanation: explanation, warnings: warnings, determinedSizeTier: determinedSizeTier, calculatedRoi: roi.toFixed(1), calculatedNetProfit: netProfit.toFixed(2), estimatedFees: estimatedFees.toFixed(2), estimatedMonthlyStorageCost: monthlyStorageCost.toFixed(2) };
        // console.log("--- Step 10: Sending Final Response ---");
        res.status(200).json(responseData);
    } catch (error) {
        console.error("!!! UNEXPECTED TOP-LEVEL ERROR in calculateScore:", error);
        res.status(500).json({ message: "Internal Server Error calculating score.", error: error.message });
    }
};
// --- End calculateScore Function ---
