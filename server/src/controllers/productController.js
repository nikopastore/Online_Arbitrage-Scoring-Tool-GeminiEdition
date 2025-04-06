// server/src/controllers/productController.js

// --- Helper Function for Fee Calculation (Version 10 - Requires User Verification/Implementation) ---
// Incorporates Referral, FBA Fulfillment (4 types), FBA Inbound Placement, and Accurate Size Tiers
const calculateAmazonFees = (productData) => {
    const {
        sellingPrice = 0, category = 'Unknown', weight = 0, // Unit weight in lbs
        dimensions = { length: 0, width: 0, height: 0 }, // Dimensions in inches
        asin, isApparel = false, isDangerousGood = false,
        inboundPlacementOption = 'Optimized' // Default to 'Optimized' (No Fee)
    } = productData;

    // console.log(`V10 Calculating fees for ASIN: ${asin || 'N/A'}...`); // Keep logs minimal if preferred

    let referralFee = 0;
    let fbaFee = 0; // Fulfillment Fee
    let placementFee = 0; // Inbound Placement Fee
    let totalEstimatedFees = 0;
    let determinedSizeTier = 'Unknown'; // Variable to store the determined tier

    // --- 1. Referral Fee Calculation ---
    if (sellingPrice > 0) {
        // ** USER VERIFICATION NEEDED: Verify ALL category rates & minimum from official source **
        const referralRateMap = { 'Electronics': 0.08, 'Home & Kitchen': 0.15, 'Toys & Games': 0.15, 'Clothing & Accessories': 0.17, 'Books': 0.15, 'Health & Personal Care': 0.15, 'Unknown': 0.15 };
        const minimumReferralFee = 0.30; // ** VERIFY THIS VALUE **
        const rate = referralRateMap[category] || referralRateMap['Unknown'];
        const calculatedReferralFee = sellingPrice * rate;
        referralFee = Math.max(calculatedReferralFee, minimumReferralFee);
    } else { referralFee = 0; }

    // --- 2. FBA Fees (Fulfillment + Placement) ---
    const unitWeight = parseFloat(weight) || 0;
    const length = parseFloat(dimensions.length) || 0;
    const width = parseFloat(dimensions.width) || 0;
    const height = parseFloat(dimensions.height) || 0;

    if (sellingPrice > 0 && unitWeight > 0 && length > 0 && width > 0 && height > 0) {

        // === a. Determine Size Tier ===
        /* --- CRITICAL USER TASK: Implement Accurate Size Tier Logic Based on Defs Image --- */
        const dims = [length, width, height].sort((a, b) => a - b); const shortestSide = dims[0]; const medianSide = dims[1]; const longestSide = dims[2]; const girth = 2 * (medianSide + shortestSide); const lengthPlusGirth = longestSide + girth;
        const dimWeightDivisor = 139; /* VERIFY */ const dimensionalWeight = (longestSide * medianSide * shortestSide) / dimWeightDivisor; const weightForTierDet = Math.max(unitWeight, dimensionalWeight); const weightForTierDetOz = weightForTierDet * 16;
        const smallStdMaxSize = { weightOz: 16, longest: 15, median: 12, shortest: 0.75 }; /* VERIFY */ const largeStdMaxSize = { weightLb: 20, longest: 18, median: 14, shortest: 8 }; /* VERIFY */ const largeBulkyMaxSize = { weightLb: 50, longest: 59, median: 33, shortest: 33, lengthGirth: 130 }; /* VERIFY */
        // Tier Logic Checks (Ensure this matches official definitions)
        if (weightForTierDetOz <= smallStdMaxSize.weightOz && longestSide <= smallStdMaxSize.longest && medianSide <= smallStdMaxSize.median && shortestSide <= smallStdMaxSize.shortest) { determinedSizeTier = 'Small Standard'; }
        else if (weightForTierDet <= largeStdMaxSize.weightLb && longestSide <= largeStdMaxSize.longest && medianSide <= largeStdMaxSize.median && shortestSide <= largeStdMaxSize.shortest) { determinedSizeTier = 'Large Standard'; }
        else if (weightForTierDet <= largeBulkyMaxSize.weightLb && longestSide <= largeBulkyMaxSize.longest && medianSide <= largeBulkyMaxSize.median && shortestSide <= largeBulkyMaxSize.shortest && lengthPlusGirth <= largeBulkyMaxSize.lengthGirth) { determinedSizeTier = 'Large Bulky'; }
        else if (longestSide > 59 || medianSide > 33 || shortestSide > 33 || lengthPlusGirth > 130 || weightForTierDet > 50) {
             if (weightForTierDet <= 50) { determinedSizeTier = 'Extra-large 0-50lb'; } else if (weightForTierDet <= 70) { determinedSizeTier = 'Extra-large 50-70lb'; } else if (weightForTierDet <= 150) { determinedSizeTier = 'Extra-large 70-150lb'; } else { determinedSizeTier = 'Extra-large 150+lb'; }
        } else { determinedSizeTier = 'Unknown'; }

        // === b. Calculate Shipping Weight for FEE Calculation ===
        let shippingWeightForFee = 0; let usesUnitWeightOnly = false; let finalFeeWeightOz = 0; let finalFeeWeightLb = 0;
        /* --- USER INPUT NEEDED: Verify Weight Basis & Rounding Rules --- */
        const packagingWeight = (determinedSizeTier === 'Small Standard' || determinedSizeTier === 'Large Standard') ? 0.25 : 1.0; /* VERIFY */
        if (determinedSizeTier === 'Small Standard' || determinedSizeTier === 'Extra-large 150+lb') { shippingWeightForFee = unitWeight; usesUnitWeightOnly = true; } else { shippingWeightForFee = Math.max(unitWeight, dimensionalWeight); usesUnitWeightOnly = false; }
        const finalShippingWeightLbRaw = shippingWeightForFee + packagingWeight;
        if (determinedSizeTier === 'Small Standard') { finalFeeWeightOz = Math.ceil(finalShippingWeightLbRaw * 16); } else { finalFeeWeightLb = Math.ceil(finalShippingWeightLbRaw); }

        // === c. Lookup FBA Fulfillment Fee ===
        const lowPriceFBACutoff = 10.00; /* VERIFY */ let usedProgram = "Standard"; fbaFee = 0;
         /* --- CRITICAL USER TASK: Fill in ALL fee lookups based on images & verification --- */
         if (isDangerousGood) { usedProgram = "Dangerous Goods"; fbaFee = 7.00; /* Placeholder VERIFY */ }
         else if (sellingPrice <= lowPriceFBACutoff) { usedProgram = isApparel ? "Low-Price Apparel" : "Low-Price Non-Apparel"; /* Add Low-Price fee lookup logic here */ }
         else { usedProgram = isApparel ? "Standard Apparel" : "Standard Non-Apparel"; /* Add Standard fee lookup logic here */ }
         fbaFee = fbaFee || 6.50; // Use placeholder if lookup failed/not implemented - REMOVE THIS LINE AFTER IMPLEMENTING LOOKUPS

        // === d. Calculate FBA Inbound Placement Fee ===
        placementFee = 0;
        if (inboundPlacementOption === 'Minimal' || inboundPlacementOption === 'Partial') {
            const weightForPlacementFee = unitWeight; /* VERIFY basis */ let feeRange = [0, 0];
            /* --- USER INPUT NEEDED: Verify placement fee ranges/breaks/logic --- */
            switch (determinedSizeTier) { /* ... cases based on image ranges ... */ }
            if (feeRange[1] > feeRange[0]) { placementFee = (feeRange[0] + feeRange[1]) / 2; } else { placementFee = feeRange[0]; }
        }

    } else { /* Fees skipped */ }

    // --- 3. Total Fees ---
    totalEstimatedFees = referralFee + fbaFee + placementFee;

    return { totalEstimatedFees, determinedSizeTier, fbaFee };
};
// --- End calculateAmazonFees Function ---


// --- lookupProduct Function ---
exports.lookupProduct = async (req, res) => { /* ... Placeholder logic ... */ };


// --- Scoring Helper Functions (Normalization) --- V18
const normalizeROI = (roi) => { const minROI=15; const targetROI=100; if(roi<minROI)return 0; let score=(roi-minROI)/(targetROI-minROI); return Math.max(0,score); };
const normalizeBSR = (bsr) => { console.warn("Using BSR as proxy..."); if(!bsr||bsr<=0)return 0; const divisor=20000; return Math.max(0,Math.min(1,1/(1+bsr/divisor))); };
const normalizeCompetition = (fbaSellers) => { if(fbaSellers===undefined||fbaSellers===null||fbaSellers<0)return 0.5; if(fbaSellers===1)return 0.4; if(fbaSellers<=5)return 1.0; if(fbaSellers<=9)return 0.7; if(fbaSellers<=12)return 0.4; if(fbaSellers<=18)return 0.1; return 0.0; };
const normalizeWeight = (fbaFee) => { if(fbaFee===null||fbaFee===undefined||fbaFee<0)return 0.5; const lowFeeThreshold=4.00; const highFeeThreshold=10.00; /* VERIFY */ if(fbaFee<=lowFeeThreshold)return 1.0; if(fbaFee>=highFeeThreshold)return 0.0; return 1-((fbaFee-lowFeeThreshold)/(highFeeThreshold-lowFeeThreshold)); };
const normalizeTrend = (trend) => { switch(trend?.toLowerCase()){case 'growing':return 1.0; case 'stable':return 0.6; case 'declining':return 0.0; default:return 0.5;} };
const normalizeVariationsCount = (count) => { if(count===null||count===undefined||count<1)return 0.5; if(count===1)return 1.0; if(count<=3)return 0.8; if(count<=6)return 0.5; if(count<=10)return 0.2; return 0.0; };
const normalizeSeasonality = (isSeasonal) => { if(isSeasonal===null||isSeasonal===undefined)return 0.5; return isSeasonal?0.2:1.0; };
const normalizeScale5Worst = (value) => { if(value===null||value===undefined||value<1||value>5)return 0.5; return 1-((value-1)/4); };


// --- calculateScore Function (Version 20 - Final Weights/Metrics/Warnings Config) ---
exports.calculateScore = async (req, res) => {
    const { costPrice, sellingPrice, category, weight, dimensions, bsr, fbaSellers, asin, isApparel, delicacyRating = 2, amazonSells = false, salesTrend = "Stable", seasonality = false, requiresAdSpend = false, variationsCount = 1, inboundPlacementOption = 'Optimized', isDangerousGood = false } = req.body;
    console.log("V20 Scoring request received.");
    let warnings = [];

    // --- Basic Validation ---
    const parsedCostPrice = parseFloat(costPrice); const parsedSellingPrice = parseFloat(sellingPrice);
    if (isNaN(parsedCostPrice) || parsedCostPrice <= 0) { return res.status(400).json({ message: 'Invalid Cost Price.' }); } if (isNaN(parsedSellingPrice) || parsedSellingPrice <= 0) { return res.status(400).json({ message: 'Invalid Selling Price.' }); }

    // --- Fee Calculation ---
    const { totalEstimatedFees: estimatedFees, determinedSizeTier, fbaFee: fulfillmentFee } = calculateAmazonFees({ sellingPrice: parsedSellingPrice, category, weight: parseFloat(weight) || 0, dimensions, asin, isApparel: !!isApparel, isDangerousGood: !!isDangerousGood, inboundPlacementOption });
    if (determinedSizeTier === 'Unknown') { warnings.push({ level: 'critical', metric: 'Fees/Size', message: 'Could not determine size tier. Fee calculation likely inaccurate.' }); }

    // --- Profitability Calculation ---
    const netProfit = parsedSellingPrice - estimatedFees - parsedCostPrice;
    const roi = (parsedCostPrice > 0) ? (netProfit / parsedCostPrice) * 100 : 0;
    console.log(`Calculated - Profit: $${netProfit.toFixed(2)}, ROI: ${roi.toFixed(2)}% (Fees: $${estimatedFees.toFixed(2)})`);

    // --- Monthly Storage Cost Calculation ---
    let monthlyStorageCost = 0; /* ... logic using determinedSizeTier ... */
    console.log(` -> Est Monthly Storage: $${monthlyStorageCost.toFixed(2)}`);

    // ===================================
    // === SCORING LOGIC ===
    // ===================================
    const weights = { roi: 32, bsr: 22, salesTrend: 10, requiresAdSpend: 9, delicacy: 8, variationsCount: 8, competitionCount: 8, amazonPresence: 7, weightSize: 7, seasonality: 4 };
    const totalDefinedWeight = 115;
    const parsedBSR = parseInt(bsr); const parsedFbaSellers = parseInt(fbaSellers); const parsedWeight = parseFloat(weight); const parsedVariations = parseInt(variationsCount); const parsedDelicacy = parseInt(delicacyRating);
    const normalized = { roi: normalizeROI(roi), bsr: normalizeBSR(parsedBSR), competitionCount: normalizeCompetition(parsedFbaSellers), weightSize: normalizeWeight(fulfillmentFee), salesTrend: normalizeTrend(salesTrend), requiresAdSpend: requiresAdSpend ? 0 : 1, delicacy: normalizeScale5Worst(parsedDelicacy), variationsCount: normalizeVariationsCount(parsedVariations), amazonPresence: amazonSells ? 0 : 1, seasonality: normalizeSeasonality(seasonality) };

    // --- Generate Warnings (Using User-Defined Thresholds) ---
    const ROI_CRITICAL_THRESHOLD = 15; const ROI_WARNING_THRESHOLD = 20; if (roi < ROI_CRITICAL_THRESHOLD) { warnings.push({ level: 'critical', metric: 'ROI', message: `ROI (${roi.toFixed(1)}%) critically low (<${ROI_CRITICAL_THRESHOLD}%).` }); } else if (roi < ROI_WARNING_THRESHOLD) { warnings.push({ level: 'warning', metric: 'ROI', message: `ROI (${roi.toFixed(1)}%) low (${ROI_CRITICAL_THRESHOLD}-${ROI_WARNING_THRESHOLD}%).` }); }
    const BSR_CRITICAL_THRESHOLD = 150000; const BSR_WARNING_THRESHOLD = 100000; if (!isNaN(parsedBSR) && parsedBSR > BSR_CRITICAL_THRESHOLD) { warnings.push({ level: 'critical', metric: 'BSR', message: `BSR (${parsedBSR}) critically high (>${BSR_CRITICAL_THRESHOLD}).` }); } else if (!isNaN(parsedBSR) && parsedBSR > BSR_WARNING_THRESHOLD) { warnings.push({ level: 'warning', metric: 'BSR', message: `BSR (${parsedBSR}) high (${BSR_WARNING_THRESHOLD}-${BSR_CRITICAL_THRESHOLD}).` }); }
    const COMP_CRITICAL_THRESHOLD = 18; const COMP_WARNING_THRESHOLD = 12; if (!isNaN(parsedFbaSellers)) { if (parsedFbaSellers > COMP_CRITICAL_THRESHOLD) { warnings.push({ level: 'critical', metric: 'Competition', message: `Competition (${parsedFbaSellers} FBA) critically high (>${COMP_CRITICAL_THRESHOLD}).` }); } else if (parsedFbaSellers > COMP_WARNING_THRESHOLD) { warnings.push({ level: 'warning', metric: 'Competition', message: `Competition (${parsedFbaSellers} FBA) high (${COMP_WARNING_THRESHOLD + 1}-${COMP_CRITICAL_THRESHOLD}).` }); } else if (parsedFbaSellers === 1) { warnings.push({ level: 'warning', metric: 'Competition', message: `Only 1 FBA seller. Check PL risk.` }); } }
    const FEE_CRITICAL_THRESHOLD = 10.00; const FEE_WARNING_THRESHOLD = 7.00; if (fulfillmentFee >= FEE_CRITICAL_THRESHOLD) { warnings.push({ level: 'critical', metric: 'Weight/Size', message: `FBA Fee ($${fulfillmentFee.toFixed(2)}) critically high (>= $${FEE_CRITICAL_THRESHOLD.toFixed(2)}).` }); } else if (fulfillmentFee >= FEE_WARNING_THRESHOLD) { warnings.push({ level: 'warning', metric: 'Weight/Size', message: `FBA Fee ($${fulfillmentFee.toFixed(2)}) high ($${FEE_WARNING_THRESHOLD.toFixed(2)}-$${FEE_CRITICAL_THRESHOLD.toFixed(2)}).` }); }
    if (amazonSells) { warnings.push({ level: 'warning', metric: 'Amazon Competition', message: `Amazon is selling directly!` }); } // Changed to warning
    if (salesTrend?.toLowerCase() === 'declining') { warnings.push({ level: 'warning', metric: 'Sales Trend', message: `Sales trend is declining.` }); }
    if (requiresAdSpend) { warnings.push({ level: 'warning', metric: 'Advertising', message: `Includes Ad Cost impacting ROI.` }); } // Updated message
    const DELICACY_CRITICAL_THRESHOLD = 1; const DELICACY_WARNING_THRESHOLD = 2; if (parsedDelicacy === DELICACY_CRITICAL_THRESHOLD) { warnings.push({ level: 'critical', metric: 'Delicacy', message: `Delicacy rating (${parsedDelicacy}/5) is Critically High Risk.` }); } else if (parsedDelicacy === DELICACY_WARNING_THRESHOLD) { warnings.push({ level: 'warning', metric: 'Delicacy', message: `Delicacy rating (${parsedDelicacy}/5) indicates item is fragile.` }); }
    const VAR_WARNING_THRESHOLD = 7; if (parsedVariations >= VAR_WARNING_THRESHOLD) { warnings.push({ level: 'warning', metric: 'Variations', message: `High number of variations (${parsedVariations}).` }); }
    if (seasonality) { warnings.push({ level: 'warning', metric: 'Seasonality', message: `Product is seasonal.` }); }
    if (isDangerousGood) { warnings.push({ level: 'warning', metric: 'Compliance', message: `Item flagged as Hazmat/Dangerous Good.` }); }
    if (inboundPlacementOption !== 'Optimized') { warnings.push({ level: 'warning', metric: 'Placement Fee', message: `Chosen '${inboundPlacementOption}' split incurs placement fees.` }); }
    if (determinedSizeTier !== 'Unknown' && !(determinedSizeTier === 'Small Standard' || determinedSizeTier === 'Large Standard')) { warnings.push({ level: 'warning', metric: 'Size Tier', message: `Item is ${determinedSizeTier}. Check fee impact.` }); }


    // --- Calculate Weighted Score ---
    let rawScore = 0; for (const key in weights) { if (normalized.hasOwnProperty(key) && weights[key] > 0) { rawScore += normalized[key] * weights[key]; } }

    // --- Apply Deal Breakers ---
    let finalScore = rawScore; let dealBreakerReason = null;
    const hasCriticalWarning = warnings.some(w => w.level === 'critical');
    if (hasCriticalWarning || determinedSizeTier === 'Unknown') { finalScore = Math.min(finalScore * 0.1, 5); dealBreakerReason = "Critical warning(s) or unknown size tier."; }
    if (roi < 0) { finalScore = 1; dealBreakerReason = (dealBreakerReason ? dealBreakerReason + " " : "") + "Negative ROI."; }

    // --- Scale to 1-100 and Clamp ---
    finalScore = (totalDefinedWeight > 0) ? (finalScore / totalDefinedWeight) * 100 : 0;
    finalScore = Math.max(1, Math.min(100, Math.round(finalScore)));
    console.log(`Final Score (1-100): ${finalScore}`);

    // --- AI Explanation Generation (Placeholder) ---
    const explanation = `(AI Placeholder - V20 Final Config) Score ${finalScore}/100. Tier: ${determinedSizeTier}. ROI ${roi.toFixed(1)}% ... Warnings: ${warnings.length}.`;

    // --- Response ---
    res.status(200).json({
        message: 'Score calculated successfully', score: finalScore, explanation: explanation, warnings: warnings,
        determinedSizeTier: determinedSizeTier, calculatedRoi: roi.toFixed(1), calculatedNetProfit: netProfit.toFixed(2),
        estimatedFees: estimatedFees.toFixed(2), estimatedMonthlyStorageCost: monthlyStorageCost.toFixed(2)
    });
};