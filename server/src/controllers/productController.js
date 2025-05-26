// server/src/controllers/productController.js
const mongoose = require('mongoose');
// const ProductAdvertisingAPIv1 = require('paapi5-nodejs-sdk'); // PA-API SDK no longer needed for this version

// --- Helper Function for Fee Calculation (Version 11 - Requires User Implementation) ---
// CRITICAL: USER MUST FILL IN ALL LOGIC AND VERIFY RATES/RULES HERE
const calculateAmazonFees = (productData) => {
    const { sellingPrice = 0, category = 'Unknown', weight = 0, dimensions = { length: 0, width: 0, height: 0 }, asin, isApparel = false, isDangerousGood = false, inboundPlacementOption = 'Optimized' } = productData;
    let referralFee = 0; let fbaFee = 0; let placementFee = 0; let totalEstimatedFees = 0; let determinedSizeTier = 'Unknown';
    // --- Start of User's V20/V31 Fee Logic Structure ---
    if (sellingPrice > 0) {
        const referralRateMap = { 'Electronics': 0.08, 'Home & Kitchen': 0.15, 'Toys & Games': 0.15, 'Clothing & Accessories': 0.17, 'Books': 0.15, 'Health & Personal Care': 0.15, 'Unknown': 0.15 };
        const minimumReferralFee = 0.30;
        const rate = referralRateMap[category] || referralRateMap['Unknown'];
        const calculatedReferralFee = sellingPrice * rate;
        referralFee = Math.max(calculatedReferralFee, minimumReferralFee);
    }
    const unitWeight = parseFloat(weight) || 0;
    const length = parseFloat(dimensions.length) || 0;
    const width = parseFloat(dimensions.width) || 0;
    const height = parseFloat(dimensions.height) || 0;
    if (sellingPrice > 0 && unitWeight > 0 && length > 0 && width > 0 && height > 0) {
        const dims = [length, width, height].sort((a, b) => a - b); const shortestSide = dims[0]; const medianSide = dims[1]; const longestSide = dims[2]; const girth = 2 * (medianSide + shortestSide); const lengthPlusGirth = longestSide + girth;
        const dimWeightDivisor = 139; const dimensionalWeight = (longestSide * medianSide * shortestSide) / dimWeightDivisor; const weightForTierDet = Math.max(unitWeight, dimensionalWeight); const weightForTierDetOz = weightForTierDet * 16;
        const smallStdMaxSize = { weightOz: 16, longest: 15, median: 12, shortest: 0.75 }; const largeStdMaxSize = { weightLb: 20, longest: 18, median: 14, shortest: 8 }; const largeBulkyMaxSize = { weightLb: 50, longest: 59, median: 33, shortest: 33, lengthGirth: 130 };
        if (weightForTierDetOz <= smallStdMaxSize.weightOz && longestSide <= smallStdMaxSize.longest && medianSide <= smallStdMaxSize.median && shortestSide <= smallStdMaxSize.shortest) { determinedSizeTier = 'Small Standard'; }
        else if (weightForTierDet <= largeStdMaxSize.weightLb && longestSide <= largeStdMaxSize.longest && medianSide <= largeStdMaxSize.median && shortestSide <= largeStdMaxSize.shortest) { determinedSizeTier = 'Large Standard'; }
        else if (weightForTierDet <= largeBulkyMaxSize.weightLb && longestSide <= largeBulkyMaxSize.longest && medianSide <= largeBulkyMaxSize.median && shortestSide <= largeBulkyMaxSize.shortest && lengthPlusGirth <= largeBulkyMaxSize.lengthGirth) { determinedSizeTier = 'Large Bulky'; }
        else if (longestSide > 59 || medianSide > 33 || shortestSide > 33 || lengthPlusGirth > 130 || weightForTierDet > 50) {
             if (weightForTierDet <= 50) { determinedSizeTier = 'Extra-large 0-50lb'; } else if (weightForTierDet <= 70) { determinedSizeTier = 'Extra-large 50-70lb'; } else if (weightForTierDet <= 150) { determinedSizeTier = 'Extra-large 70-150lb'; } else { determinedSizeTier = 'Extra-large 150+lb'; }
        } else { determinedSizeTier = 'Unknown'; }
        let shippingWeightForFee = 0; let usesUnitWeightOnly = false; let finalFeeWeightOz = 0; let finalFeeWeightLb = 0;
        const packagingWeight = (determinedSizeTier === 'Small Standard' || determinedSizeTier === 'Large Standard') ? 0.25 : 1.0;
        if (determinedSizeTier === 'Small Standard' || determinedSizeTier === 'Extra-large 150+lb') { shippingWeightForFee = unitWeight; usesUnitWeightOnly = true; } else { shippingWeightForFee = Math.max(unitWeight, dimensionalWeight); usesUnitWeightOnly = false; }
        const finalShippingWeightLbRaw = shippingWeightForFee + packagingWeight;
        if (determinedSizeTier === 'Small Standard') { finalFeeWeightOz = Math.ceil(finalShippingWeightLbRaw * 16); } else { finalFeeWeightLb = Math.ceil(finalShippingWeightLbRaw); }
        const lowPriceFBACutoff = 10.00; let usedProgram = "Standard"; fbaFee = 0;
         if (isDangerousGood) { usedProgram = "Dangerous Goods"; fbaFee = 7.00; }
         else if (sellingPrice <= lowPriceFBACutoff) { usedProgram = isApparel ? "Low-Price Apparel" : "Low-Price Non-Apparel"; /* Add Low-Price fee logic */ }
         else { usedProgram = isApparel ? "Standard Apparel" : "Standard Non-Apparel"; /* Add Standard fee logic */ }
         fbaFee = fbaFee || 6.50; // Placeholder - REMOVE
        placementFee = 0;
        if (inboundPlacementOption === 'Minimal' || inboundPlacementOption === 'Partial') { /* Add placement fee logic */ }
    }
    // --- End of User's V20/V31 Fee Logic Structure ---
    totalEstimatedFees = referralFee + fbaFee + placementFee;
    console.log(` -> Determined Size Tier: ${determinedSizeTier}`);
    console.log(` -> Total Estimated Fees: $${totalEstimatedFees.toFixed(2)}`);
    return { totalEstimatedFees, determinedSizeTier, fbaFee };
};
// --- End calculateAmazonFees Function ---


// --- lookupProduct Function (Version 42 - Robust Placeholder Data) ---
exports.lookupProduct = async (req, res) => {
    const { identifier } = req.body;
    console.log("======================================================");
    console.log("V42 lookupProduct called with identifier:", identifier);
    console.log("======================================================");

    if (!identifier) {
        return res.status(400).json({ message: 'Product identifier (ASIN/UPC) is required.' });
    }

    const placeholderData = {
        "B07VGRJDFY": { // Example: Echo Dot
            asin: "B07VGRJDFY", title: "Echo Dot (3rd Gen) - Smart speaker with Alexa",
            category: "Electronics", sellingPrice: 39.99, weight: 0.66,
            dimensions: { length: 3.9, width: 3.9, height: 1.7 },
            bsr: 500, fbaSellers: 10, isApparel: false, variationsCount: 3,
            imageUrl: "https://m.media-amazon.com/images/I/61EXU8BuGZL._AC_UY218_.jpg"
        },
        "B086DR2S2C": { // Example: Apparel (T-Shirt)
            asin: "B086DR2S2C", title: "Amazon Essentials Men's Regular-Fit Cotton Pique Polo Shirt",
            category: "Clothing & Accessories", sellingPrice: 18.90, weight: 0.5,
            dimensions: { length: 13, width: 10, height: 1 },
            bsr: 1200, fbaSellers: 5, isApparel: true, variationsCount: 12,
            imageUrl: "https://m.media-amazon.com/images/I/71sR0A0+MBS._AC_UY218_.jpg"
        },
        "B07H91HY2J": { // Example: Large Standard (Blender)
            asin: "B07H91HY2J", title: "Ninja Professional Countertop Blender with 1100-Watt Base",
            category: "Home & Kitchen", sellingPrice: 89.99, weight: 7.6,
            dimensions: { length: 17, width: 8, height: 10 }, // Should be Large Standard
            bsr: 3000, fbaSellers: 3, isApparel: false, variationsCount: 1,
            imageUrl: "https://m.media-amazon.com/images/I/71kdXy5p4IL._AC_UY218_.jpg"
        },
        "B00004OCLD": { // Example: Small Standard (Book)
            asin: "B00004OCLD", title: "The Lord of the Rings by J.R.R. Tolkien (Paperback)",
            category: "Books", sellingPrice: 22.50, weight: 0.9, // < 1 lb after packaging
            dimensions: { length: 7.7, width: 5.1, height: 1.5 }, // Should be Small Standard
            bsr: 150, fbaSellers: 15, isApparel: false, variationsCount: 1,
            imageUrl: "https://m.media-amazon.com/images/I/71jLBXtWJWL._AC_UY218_.jpg"
        },
        "B01N4HS7B8": { // Example: Low Price Item
            asin: "B01N4HS7B8", title: "BIC Round Stic Xtra Life Ballpoint Pen, Medium Point (1.0mm), Blue, 144-Count",
            category: "Office Products", sellingPrice: 9.97, // Eligible for Low-Price FBA
            weight: 1.2, // Small standard or light large standard
            dimensions: { length: 6, width: 3, height: 3 },
            bsr: 250, fbaSellers: 8, isApparel: false, variationsCount: 1,
            imageUrl: "https://m.media-amazon.com/images/I/811P9GUDSIL._AC_UY218_.jpg"
        },
        "DEFAULT_PLACEHOLDER": {
            asin: identifier || 'DEFAULT123', title: 'Default Placeholder Product (Enter Real ASIN)',
            category: 'Unknown', sellingPrice: 29.99, weight: 1.0,
            dimensions: { length: 8, width: 6, height: 2 },
            bsr: 100000, fbaSellers: 7, isApparel: false, variationsCount: 1,
            imageUrl: `https://placehold.co/200x200?text=${identifier||'Product'}`
        }
    };

    const product = placeholderData[identifier.trim().toUpperCase()] || placeholderData["DEFAULT_PLACEHOLDER"];
    if (product.asin === 'DEFAULT123' && identifier) product.asin = identifier; // Use actual identifier if default is chosen

    console.log("Returning placeholder product data:", product);
    return res.status(200).json({ message: 'Product data fetched (Placeholder)', product });
};
// --- End lookupProduct Function ---


// --- Scoring Helper Functions (Normalization) --- V31 Definitions
const normalizeROI = (roi) => { /* ...As in V31 ... */ };
const normalizeBSR = (bsr) => { /* ...As in V31 ... */ };
const normalizeCompetition = (fbaSellers) => { /* ...As in V31 ... */ };
const normalizeWeight = (unitWeight) => { /* ...As in V31 with adjusted steps... */ };
const normalizeDimensions = (determinedSizeTier) => { /* ...As in V31 ... */ };
const normalizeTrend = (trend) => { /* ...As in V31 ... */ };
const normalizeVariationsCount = (count) => { /* ...As in V31 ... */ };
const normalizeSeasonality = (isSeasonal) => { /* ...As in V31 ... */ };
const normalizeScale5Best = (value) => { /* ...As in V31 ... */ };


// --- calculateScore Function (Version 31 - Based on User's V20 + All Wt/Dim/Var fixes) ---
exports.calculateScore = async (req, res) => {
    console.log("V31 Scoring request received."); // Keep version from baseline used for scoring logic
    try {
        const { costPrice, sellingPrice, category, weight, dimensions, bsr, fbaSellers, asin, isApparel, delicacyRating = 2, amazonSells = false, salesTrend = "Stable", seasonality = false, advertisingCostPerUnit = 0, variationsCount = 1, inboundPlacementOption = 'Optimized', isDangerousGood = false } = req.body;
        let warnings = [];
        // console.log("--- Step 0: Basic Validation ---");
        const parsedCostPrice = parseFloat(costPrice); const parsedSellingPrice = parseFloat(sellingPrice); const parsedAdvertisingCost = parseFloat(advertisingCostPerUnit) || 0;
        if (isNaN(parsedCostPrice) || parsedCostPrice <= 0) { return res.status(400).json({ message: 'Invalid Cost Price.' }); } if (isNaN(parsedSellingPrice) || parsedSellingPrice <= 0) { return res.status(400).json({ message: 'Invalid Selling Price.' }); } if (isNaN(parsedAdvertisingCost) || parsedAdvertisingCost < 0) { return res.status(400).json({ message: 'Invalid Advertising Cost.' }); }
        // console.log("--- Step 0: Validation Passed ---");

        // console.log("--- Step 1: Fee Calculation ---");
        let estimatedFees = 0; let determinedSizeTier = 'Unknown'; let fulfillmentFee = 0;
        try {
            const feeResult = calculateAmazonFees({ sellingPrice: parsedSellingPrice, category, weight: parseFloat(weight) || 0, dimensions, asin, isApparel: !!isApparel, isDangerousGood: !!isDangerousGood, inboundPlacementOption });
            if (feeResult && typeof feeResult === 'object' && feeResult.hasOwnProperty('totalEstimatedFees')) {
                 estimatedFees = feeResult.totalEstimatedFees; determinedSizeTier = feeResult.determinedSizeTier; fulfillmentFee = feeResult.fbaFee;
                 if (determinedSizeTier === 'Unknown') { warnings.push({ level: 'critical', metric: 'Fees/Size', message: 'Could not determine size tier. Fee & Dimension scoring inaccurate.' }); }
            } else { console.error("!!! calculateAmazonFees returned unexpected value:", feeResult); warnings.push({ level: 'critical', metric: 'Fees', message: 'Internal error during fee calculation (unexpected return).' }); determinedSizeTier = 'Unknown'; estimatedFees = 0; fulfillmentFee = 0; }
        } catch (error) { console.error("!!! Error occurred INSIDE calculateAmazonFees:", error); warnings.push({ level: 'critical', metric: 'Fees', message: `Internal error during fee calculation: ${error.message}` }); determinedSizeTier = 'Unknown'; estimatedFees = 0; fulfillmentFee = 0; }
        // console.log(`--- Step 1: Fees processed - Tier: ${determinedSizeTier}, FulfillFee: ${fulfillmentFee}, TotalFees: ${estimatedFees}`);

        // console.log("--- Step 2: Profitability Calculation ---");
        const netProfit = parsedSellingPrice - estimatedFees - parsedCostPrice - parsedAdvertisingCost;
        const roi = (parsedCostPrice > 0) ? (netProfit / parsedCostPrice) * 100 : 0;
        // console.log(` -> Profit: $${netProfit.toFixed(2)}, ROI: ${roi.toFixed(2)}%`);

        // console.log("--- Step 3: Storage Cost Calculation ---");
        let monthlyStorageCost = 0; /* ... logic using determinedSizeTier ... */
        // console.log(` -> Est Monthly Storage: $${monthlyStorageCost.toFixed(2)}`);

        // console.log("--- Step 4: Normalization ---");
        const weights = { roi: 32, bsr: 22, salesTrend: 10, delicacy: 8, variationsCount: 8, competitionCount: 8, amazonPresence: 7, weight: 4, dimensions: 3, seasonality: 4, };
        const totalDefinedWeight = 106;
        const parsedBSR = parseInt(bsr); const parsedFbaSellers = parseInt(fbaSellers); const parsedWeight = parseFloat(weight) || 0; const parsedVariations = parseInt(variationsCount) || 1; const parsedDelicacy = parseInt(delicacyRating);
        const normalized = {
            roi: normalizeROI(roi), bsr: normalizeBSR(parsedBSR), competitionCount: normalizeCompetition(parsedFbaSellers),
            weight: normalizeWeight(parsedWeight), dimensions: normalizeDimensions(determinedSizeTier),
            salesTrend: normalizeTrend(salesTrend), delicacy: normalizeScale5Best(parsedDelicacy),
            variationsCount: normalizeVariationsCount(parsedVariations), amazonPresence: amazonSells ? 0 : 1, seasonality: normalizeSeasonality(seasonality),
        };
        // console.log(` -> Normalized Values: ${JSON.stringify(normalized, (k,v) => typeof v === 'number' ? v.toFixed(3) : v)}`);
        console.log(`--- DEBUG --- Input Weight: ${parsedWeight}, Normalized Weight Score: ${normalized.weight?.toFixed(2)}`); // Keep these for tuning
        console.log(`--- DEBUG --- Determined Size Tier: ${determinedSizeTier}, Normalized Dimension Score: ${normalized.dimensions?.toFixed(2)}`);
        console.log(`--- DEBUG --- Input Variations: ${parsedVariations}, Normalized Variations Score: ${normalized.variationsCount?.toFixed(2)}`);

        // console.log("--- Step 5: Generating Warnings ---");
        // ... (All warning logic blocks from V31) ...
        // console.log(` -> Generated ${warnings.length} warnings.`);

        // console.log("--- Step 6: Calculating Weighted Score ---");
        let rawScore = 0;
        for (const key in weights) { if (normalized.hasOwnProperty(key) && weights.hasOwnProperty(key) && weights[key] > 0) { if (typeof normalized[key] === 'number' && !isNaN(normalized[key])) { rawScore += normalized[key] * weights[key]; } else { console.warn(`Warning: Norm value for '${key}' NaN/invalid.`); } } else if (weights.hasOwnProperty(key) && weights[key] > 0) { console.warn(`Warning: Norm value missing for '${key}'.`); } }
        // console.log(` -> Raw Weighted Score: ${rawScore.toFixed(1)} (Out of ${totalDefinedWeight})`);

        // console.log("--- Step 7: Applying Deal Breakers ---");
        let finalScore = rawScore; let dealBreakerReason = null;
        const hasCriticalWarning = warnings.some(w => w.level === 'critical');
        if ((!isNaN(parsedWeight) && parsedWeight > 50) || hasCriticalWarning || determinedSizeTier === 'Unknown') { finalScore = Math.min(finalScore * 0.1, 5); dealBreakerReason = "Critical warning/Weight/Tier."; if (!isNaN(parsedWeight) && parsedWeight > 50 && !warnings.some(w => w.metric === 'Weight' && w.level === 'critical')) { warnings.push({ level: 'critical', metric: 'Weight', message: `Weight (${parsedWeight} lbs) > 50lbs. Score heavily penalized.` }); } }
        if (roi < 0) { finalScore = 1; dealBreakerReason = (dealBreakerReason ? dealBreakerReason + " " : "") + "Negative ROI."; }
        // console.log(` -> Score after deal breakers: ${finalScore.toFixed(1)}`);

        // console.log("--- Step 8: Scaling and Clamping Score ---");
        finalScore = (totalDefinedWeight > 0) ? (finalScore / totalDefinedWeight) * 100 : 0;
        if (isNaN(finalScore)) { console.error("!!! Final Score is NaN before clamping!"); finalScore = 1; warnings.push({ level: 'critical', metric: 'Score', message: 'Internal calculation error resulted in invalid score.' }); }
        finalScore = Math.max(1, Math.min(100, Math.round(finalScore)));
        console.log(`Final Score (1-100): ${finalScore}`); // Keep this log active

        const explanation = `(AI Placeholder - V31 Base with Placeholder Lookup) Score ${finalScore}/100...`;
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
