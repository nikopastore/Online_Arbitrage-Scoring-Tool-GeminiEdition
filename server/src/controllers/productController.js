// server/src/controllers/productController.js
const mongoose = require('mongoose'); // Ensure mongoose is required

// --- Helper Function for Fee Calculation (Version 11 - Requires User Implementation) ---
// Incorporates Referral, FBA Fulfillment (4 types), FBA Inbound Placement, and Accurate Size Tiers
// CRITICAL: USER MUST FILL IN ALL LOGIC AND VERIFY RATES/RULES HERE
const calculateAmazonFees = (productData) => {
    const {
        sellingPrice = 0, category = 'Unknown', weight = 0, // Unit weight in lbs
        dimensions = { length: 0, width: 0, height: 0 }, // Dimensions in inches
        asin, isApparel = false, isDangerousGood = false,
        inboundPlacementOption = 'Optimized' // Default to 'Optimized' (No Fee)
    } = productData;

    // console.log(`--- calculateAmazonFees START ---`); // Optional log
    // console.log(`Input Data: Price=${sellingPrice}, Cat=${category}, Wt=${weight}, Dims=${JSON.stringify(dimensions)}, Apparel=${isApparel}, DG=${isDangerousGood}, Placement=${inboundPlacementOption}`);

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
        // console.log(` -> Referral Fee: $${referralFee.toFixed(2)}`);
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
        console.log(` -> Determined Size Tier: ${determinedSizeTier}`);

        // === b. Calculate Shipping Weight for FEE Calculation ===
        let shippingWeightForFee = 0; let usesUnitWeightOnly = false; let finalFeeWeightOz = 0; let finalFeeWeightLb = 0;
        /* --- USER INPUT NEEDED: Verify Weight Basis & Rounding Rules --- */
        const packagingWeight = (determinedSizeTier === 'Small Standard' || determinedSizeTier === 'Large Standard') ? 0.25 : 1.0; /* VERIFY */
        if (determinedSizeTier === 'Small Standard' || determinedSizeTier === 'Extra-large 150+lb') { shippingWeightForFee = unitWeight; usesUnitWeightOnly = true; } else { shippingWeightForFee = Math.max(unitWeight, dimensionalWeight); usesUnitWeightOnly = false; }
        const finalShippingWeightLbRaw = shippingWeightForFee + packagingWeight;
        if (determinedSizeTier === 'Small Standard') { finalFeeWeightOz = Math.ceil(finalShippingWeightLbRaw * 16); } else { finalFeeWeightLb = Math.ceil(finalShippingWeightLbRaw); }
        // console.log(` -> Fee Wt Basis: ${usesUnitWeightOnly ? 'Unit' : 'Max(Unit,Dim)'}. Rounded Fee Wt: ${determinedSizeTier === 'Small Standard' ? finalFeeWeightOz + ' oz' : finalFeeWeightLb + ' lbs'}`);

        // === c. Lookup FBA Fulfillment Fee ===
        const lowPriceFBACutoff = 10.00; /* VERIFY */ let usedProgram = "Standard"; fbaFee = 0;
         /* --- CRITICAL USER TASK: Fill in ALL fee lookups based on images & verification --- */
         if (isDangerousGood) { usedProgram = "Dangerous Goods"; fbaFee = 7.00; /* Placeholder VERIFY */ }
         else if (sellingPrice <= lowPriceFBACutoff) { usedProgram = isApparel ? "Low-Price Apparel" : "Low-Price Non-Apparel"; /* Add Low-Price fee lookup logic here */ }
         else { usedProgram = isApparel ? "Standard Apparel" : "Standard Non-Apparel"; /* Add Standard fee lookup logic here */ }
         // ** REMOVE THE NEXT LINE ONCE FEE LOOKUPS ARE IMPLEMENTED **
         fbaFee = fbaFee || 6.50; // Using placeholder if lookup failed/not implemented
         // console.log(` -> FBA Fulfillment Fee (Program: ${usedProgram}, Tier: ${determinedSizeTier}): $${fbaFee.toFixed(2)}`);

        // === d. Calculate FBA Inbound Placement Fee ===
        placementFee = 0;
        if (inboundPlacementOption === 'Minimal' || inboundPlacementOption === 'Partial') {
            const weightForPlacementFee = unitWeight; /* VERIFY basis */ let feeRange = [0, 0];
            /* --- USER INPUT NEEDED: Verify placement fee ranges/breaks/logic --- */
            switch (determinedSizeTier) { /* ... cases based on image ranges ... */ }
            if (feeRange[1] > feeRange[0]) { placementFee = (feeRange[0] + feeRange[1]) / 2; } else { placementFee = feeRange[0]; }
        }
         // console.log(` -> FBA Inbound Placement Fee (Option: ${inboundPlacementOption}): $${placementFee.toFixed(2)}`);

    } else { console.log(" -> FBA Fees skipped (inputs invalid)"); }

    // --- 3. Total Fees ---
    totalEstimatedFees = referralFee + fbaFee + placementFee;
    console.log(` -> Total Estimated Fees: $${totalEstimatedFees.toFixed(2)}`);

    // Return fees AND determined tier AND fbaFee portion
    console.log(`--- calculateAmazonFees END --- Returning: Tier=${determinedSizeTier}, FulfillFee=${fbaFee}, TotalFees=${totalEstimatedFees}`);
    return { totalEstimatedFees, determinedSizeTier, fbaFee };
};
// --- End calculateAmazonFees Function ---


// --- lookupProduct Function ---
// Ensure placeholders include necessary fields for scoring
exports.lookupProduct = async (req, res) => { /* ... Placeholder logic from your V20 ... */ };


// --- Scoring Helper Functions (Normalization) --- V35.1 (Based on V31 + New Sales/TTS)
const normalizeROI = (roi) => { const minROI=15; const targetROI=100; if(roi<minROI)return 0; let score=(roi-minROI)/(targetROI-minROI); return Math.max(0,Math.min(1,score)); }; // Capped ROI score at 1
const normalizeBSR = (bsr) => { /* Using BSR as proxy... */ if(!bsr||bsr<=0)return 0.0; const divisor=20000; return Math.max(0,Math.min(1,1/(1+bsr/divisor))); };
const normalizeCompetition = (fbaSellers) => { if(fbaSellers===undefined||fbaSellers===null||fbaSellers<0)return 0.5; if(fbaSellers===1)return 0.4; if(fbaSellers<=5)return 1.0; if(fbaSellers<=9)return 0.7; if(fbaSellers<=12)return 0.4; if(fbaSellers<=18)return 0.1; return 0.0; };
const normalizeWeight = (unitWeight) => { /* ... Weight logic based on lbs from V31 ... */ if (unitWeight === null || unitWeight === undefined || unitWeight <= 0) return 0.5; if (unitWeight > 50) return 0.0; if (unitWeight <= 1) return 1.0; if (unitWeight <= 2) return 0.85; if (unitWeight <= 3) return 0.70; if (unitWeight <= 5) return 0.60; if (unitWeight <= 10) return 0.50; if (unitWeight <= 15) return 0.40; if (unitWeight <= 20) return 0.30; const score_at_20=0.30; const score_at_50=0.1; const score_20_50 = score_at_20 - ((unitWeight - 20) * (score_at_20 - score_at_50) / (50 - 20)); return Math.max(score_at_50, score_20_50); };
const normalizeDimensions = (determinedSizeTier) => { /* ... Tier-based logic from V31, softer penalties ... */ switch (determinedSizeTier) { case 'Small Standard': return 1.0; case 'Large Standard': return 0.8; case 'Large Bulky': return 0.6; case 'Extra-large 0-50lb': return 0.4; case 'Extra-large 50-70lb': return 0.3; case 'Extra-large 70-150lb': return 0.2; case 'Extra-large 150+lb': return 0.1; default: return 0.5; } };
const normalizeTrend = (trend) => { switch(trend?.toLowerCase()){case 'growing':return 1.0; case 'stable':return 0.6; case 'declining':return 0.0; default:return 0.5;} };
const normalizeVariationsCount = (count) => { /* ... Var logic from V31 (>=20 worst) ... */ if(count===null||count===undefined||count<1)return 0.5; if(count===1)return 1.0; if(count<=3)return 0.8; if(count<=6)return 0.6; if(count<=10)return 0.4; if(count<=19)return 0.2; return 0.0; };
const normalizeSeasonality = (isSeasonal) => { if(isSeasonal===null||isSeasonal===undefined)return 0.5; return isSeasonal?0.2:1.0; };
const normalizeScale5Best = (value) => { if (value === null || value === undefined || value < 1 || value > 5) return 0.5; return (value - 1) / 4; }; // For Delicacy

// *** UPDATED: Normalize Estimated Sales Per Month (Aggressive low-end penalty) ***
const normalizeSalesPerMonth = (sales) => {
    // console.log(`--- Normalizing Sales/Month: ${sales} ---`); // Optional log
    let score;
    if (sales === null || sales === undefined || isNaN(sales) || sales < 0) { score = 0.0; /* console.log("Sales Score: 0.0 (Not Provided/Invalid)"); */ }
    else if (sales >= 61) { score = 1.0; /* console.log("Sales Score: 1.0 (>=61)"); */ }
    else if (sales >= 30) { score = 0.8; /* console.log("Sales Score: 0.8 (30-60)"); */ }
    else if (sales >= 15) { score = 0.5; /* console.log("Sales Score: 0.5 (15-29)"); */ }
    else { score = 0.1; /* console.log("Sales Score: 0.1 (<15, Poor)"); */ } // Very poor contribution
    return score;
};
// *** UPDATED: Normalize Estimated Time To Sale (Days) (Aggressive high-end penalty) ***
const normalizeTimeToSale = (days) => {
    // console.log(`--- Normalizing TimeToSale: ${days} days ---`); // Optional log
    let score;
    if (days === null || days === undefined || isNaN(days) || days < 0) { score = 0.5; /* console.log("TTS Score: 0.5 (Not Provided/Invalid)"); */ }
    else if (days <= 1) { score = 1.0; /* console.log("TTS Score: 1.0 (<=1d)"); */ }
    else if (days <= 30) { score = 0.8; /* console.log("TTS Score: 0.8 (2-30d)"); */ }
    else if (days <= 60) { score = 0.6; /* console.log("TTS Score: 0.6 (31-60d)"); */ }
    else if (days <= 90) { score = 0.4; /* console.log("TTS Score: 0.4 (61-90d)"); */ }
    else if (days <= 180) { score = 0.2; /* console.log("TTS Score: 0.2 (91-180d)"); */ }
    else { score = 0.0; /* console.log("TTS Score: 0.0 (>180d, Worst)"); */ }
    return score;
};


// --- calculateScore Function (Version 35.1 - Hybrid BSR & Critical Optional Metrics) ---
exports.calculateScore = async (req, res) => {
    console.log("V35.1 Scoring request received (Hybrid BSR & Critical Optional Metrics).");
    try {
        const { costPrice, sellingPrice, category, weight, dimensions, bsr, fbaSellers, asin, isApparel, delicacyRating = 3, amazonSells = false, salesTrend = "Stable", seasonality = false, advertisingCostPerUnit = 0, variationsCount = 1, inboundPlacementOption = 'Optimized', isDangerousGood = false, estimatedSalesPerMonth = null, estimatedTimeToSale = null, supplierDiscountRebate = 0 } = req.body;
        let warnings = [];

        // --- Basic Validation ---
        console.log("--- Step 0: Basic Validation ---");
        const parsedCostPrice = parseFloat(costPrice); const parsedSellingPrice = parseFloat(sellingPrice); const parsedAdvertisingCost = parseFloat(advertisingCostPerUnit) || 0; const parsedDiscountRebate = parseFloat(supplierDiscountRebate) || 0; const parsedSalesPerMonth = estimatedSalesPerMonth !== null && String(estimatedSalesPerMonth).trim() !== '' ? parseInt(estimatedSalesPerMonth) : null; const parsedTimeToSale = estimatedTimeToSale !== null && String(estimatedTimeToSale).trim() !== '' ? parseInt(estimatedTimeToSale) : null;
        if (isNaN(parsedCostPrice) || parsedCostPrice <= 0) { return res.status(400).json({ message: 'Invalid Cost Price.' }); } if (isNaN(parsedSellingPrice) || parsedSellingPrice <= 0) { return res.status(400).json({ message: 'Invalid Selling Price.' }); } if (isNaN(parsedAdvertisingCost) || parsedAdvertisingCost < 0) { return res.status(400).json({ message: 'Invalid Advertising Cost.' }); } if (isNaN(parsedDiscountRebate) || parsedDiscountRebate < 0) { return res.status(400).json({ message: 'Invalid Supplier Discount/Rebate.' }); } if (parsedSalesPerMonth !== null && (isNaN(parsedSalesPerMonth) || parsedSalesPerMonth < 0)) { return res.status(400).json({ message: 'Invalid Estimated Sales Per Month.' }); } if (parsedTimeToSale !== null && (isNaN(parsedTimeToSale) || parsedTimeToSale < 0)) { return res.status(400).json({ message: 'Invalid Estimated Time To Sale.' }); }
        console.log("--- Step 0: Validation Passed ---");

        // --- Fee Calculation (Wrapped in try-catch) ---
        console.log("--- Step 1: Fee Calculation ---");
        let estimatedFees = 0; let determinedSizeTier = 'Unknown'; let fulfillmentFee = 0;
        try {
            const feeResult = calculateAmazonFees({ sellingPrice: parsedSellingPrice, category, weight: parseFloat(weight) || 0, dimensions, asin, isApparel: !!isApparel, isDangerousGood: !!isDangerousGood, inboundPlacementOption });
            if (feeResult && typeof feeResult === 'object' && feeResult.hasOwnProperty('totalEstimatedFees')) {
                 estimatedFees = feeResult.totalEstimatedFees; determinedSizeTier = feeResult.determinedSizeTier; fulfillmentFee = feeResult.fbaFee;
                 console.log(`--- Step 1: Fees processed - Tier: ${determinedSizeTier}, FulfillFee: ${fulfillmentFee}, TotalFees: ${estimatedFees}`);
                 if (determinedSizeTier === 'Unknown') { warnings.push({ level: 'critical', metric: 'Fees/Size', message: 'Could not determine size tier. Fee & Dimension scoring inaccurate.' }); }
            } else { console.error("!!! calculateAmazonFees returned unexpected value:", feeResult); warnings.push({ level: 'critical', metric: 'Fees', message: 'Internal error during fee calculation (unexpected return).' }); determinedSizeTier = 'Unknown'; estimatedFees = 0; fulfillmentFee = 0; }
        } catch (error) { console.error("!!! Error occurred INSIDE calculateAmazonFees:", error); warnings.push({ level: 'critical', metric: 'Fees', message: `Internal error during fee calculation: ${error.message}` }); determinedSizeTier = 'Unknown'; estimatedFees = 0; fulfillmentFee = 0; }

        // --- Profitability Calculation (Includes Ad Cost AND Discount/Rebate) ---
        console.log("--- Step 2: Profitability Calculation ---");
        const netProfit = parsedSellingPrice - estimatedFees - parsedCostPrice - parsedAdvertisingCost + parsedDiscountRebate;
        const roi = (parsedCostPrice > 0) ? (netProfit / parsedCostPrice) * 100 : 0;
        console.log(` -> Profit: $${netProfit.toFixed(2)}, ROI: ${roi.toFixed(2)}%`);

        // --- Monthly Storage Cost Calculation ---
        console.log("--- Step 3: Storage Cost Calculation ---");
        let monthlyStorageCost = 0; /* ... logic using determinedSizeTier ... */
        console.log(` -> Est Monthly Storage: $${monthlyStorageCost.toFixed(2)}`);

        // ===================================
        // === SCORING LOGIC ===
        // ===================================
        console.log("--- Step 4: Normalization ---");
        // --- 1. Define Weights (BSR is back, optional metrics have small weights) --- *** UPDATED ***
        const weights = {
            roi: 30,
            bsr: 22, // BSR is a primary factor
            salesTrend: 10,
            delicacy: 8,
            variationsCount: 8,
            competitionCount: 8,
            amazonPresence: 7,
            physicalWeight: 4,      // Renamed from 'weight' from your V20 base
            physicalDimensions: 3,  // Renamed from 'dimensions' from your V20 base
            seasonality: 4,
            estSalesFactor: 3,      // New small weight for Est Sales/Month
            estTimeToSaleFactor: 3, // New small weight for Est Time To Sale
        };
        const totalDefinedWeight = 110; // 30+22+10+8+8+8+7+4+3+4+3+3 = 110
        console.log(` -> Total Defined Weight: ${totalDefinedWeight}`);

        // --- 2. Normalize Metrics ---
        const parsedBSR = parseInt(bsr);
        const parsedFbaSellers = parseInt(fbaSellers);
        const parsedWeight = parseFloat(weight) || 0;
        const parsedVariations = parseInt(variationsCount) || 1;
        const parsedDelicacy = parseInt(delicacyRating);

        const normalized = {
            roi: normalizeROI(roi),
            bsr: normalizeBSR(parsedBSR), // BSR is normalized
            salesTrend: normalizeTrend(salesTrend),
            delicacy: normalizeScale5Best(parsedDelicacy),
            variationsCount: normalizeVariationsCount(parsedVariations),
            competitionCount: normalizeCompetition(parsedFbaSellers),
            amazonPresence: amazonSells ? 0 : 1,
            physicalWeight: normalizeWeight(parsedWeight), // Uses new physical weight normalization
            physicalDimensions: normalizeDimensions(determinedSizeTier), // Uses new dimension normalization
            seasonality: normalizeSeasonality(seasonality),
            estSalesFactor: normalizeSalesPerMonth(parsedSalesPerMonth), // Normalized optional factor
            estTimeToSaleFactor: normalizeTimeToSale(parsedTimeToSale), // Normalized optional factor
        };
        console.log(` -> Normalized Values: ${JSON.stringify(normalized, (k,v) => typeof v === 'number' ? v.toFixed(3) : v)}`);
        // Debug Logs
        console.log(`--- DEBUG --- BSR: ${parsedBSR}, Normalized BSR Score: ${normalized.bsr?.toFixed(2)}`);
        console.log(`--- DEBUG --- Input Sales/Mo: ${parsedSalesPerMonth}, Normalized Est Sales Factor: ${normalized.estSalesFactor?.toFixed(2)}`);
        console.log(`--- DEBUG --- Input TimeToSale: ${parsedTimeToSale}, Normalized Est TTS Factor: ${normalized.estTimeToSaleFactor?.toFixed(2)}`);
        console.log(`--- DEBUG --- Input Weight: ${parsedWeight}, Normalized physicalWeight Score: ${normalized.physicalWeight?.toFixed(2)}`);
        console.log(`--- DEBUG --- Determined Size Tier: ${determinedSizeTier}, Normalized physicalDimensions Score: ${normalized.physicalDimensions?.toFixed(2)}`);


        // --- Define Warning Thresholds ---
        const ROI_CRITICAL_THRESHOLD = 15; const ROI_WARNING_THRESHOLD = 20;
        const BSR_CRITICAL_THRESHOLD = 150000; const BSR_WARNING_THRESHOLD = 100000;
        const COMP_CRITICAL_THRESHOLD = 18; const COMP_WARNING_THRESHOLD = 12;
        const WEIGHT_CRITICAL_THRESHOLD = 50; const WEIGHT_WARNING_THRESHOLD = 20;
        const DELICACY_CRITICAL_THRESHOLD = 1; const DELICACY_WARNING_THRESHOLD = 2;
        const VAR_WARNING_THRESHOLD = 20;
        const SALES_LOW_CRITICAL_THRESHOLD = 15; // For Est Sales/Month
        const TIME_SLOW_WARN_THRESHOLD = 30; const TIME_SLOW_CRITICAL_THRESHOLD = 180; // For Est Time to Sale

        // --- Generate Warnings ---
        console.log("--- Step 5: Generating Warnings ---");
        // ROI
        if (roi < ROI_CRITICAL_THRESHOLD) { warnings.push({ level: 'critical', metric: 'ROI', message: `ROI (${roi.toFixed(1)}%) critically low (<${ROI_CRITICAL_THRESHOLD}%).` }); } else if (roi < ROI_WARNING_THRESHOLD) { warnings.push({ level: 'warning', metric: 'ROI', message: `ROI (${roi.toFixed(1)}%) low (${ROI_CRITICAL_THRESHOLD}-${ROI_WARNING_THRESHOLD}%).` }); }
        // BSR (now always checked, as it's a primary scoring factor)
        if (!isNaN(parsedBSR) && parsedBSR > BSR_CRITICAL_THRESHOLD) { warnings.push({ level: 'critical', metric: 'BSR', message: `BSR (${parsedBSR}) critically high (>${BSR_CRITICAL_THRESHOLD}).` }); } else if (!isNaN(parsedBSR) && parsedBSR > BSR_WARNING_THRESHOLD) { warnings.push({ level: 'warning', metric: 'BSR', message: `BSR (${parsedBSR}) high (${BSR_WARNING_THRESHOLD}-${BSR_CRITICAL_THRESHOLD}).` }); }
        // Competition
        if (!isNaN(parsedFbaSellers)) { if (parsedFbaSellers > COMP_CRITICAL_THRESHOLD) { warnings.push({ level: 'critical', metric: 'Competition', message: `Competition (${parsedFbaSellers} FBA) critically high (>${COMP_CRITICAL_THRESHOLD}).` }); } else if (parsedFbaSellers > COMP_WARNING_THRESHOLD) { warnings.push({ level: 'warning', metric: 'Competition', message: `Competition (${parsedFbaSellers} FBA) high (${COMP_WARNING_THRESHOLD + 1}-${COMP_CRITICAL_THRESHOLD}).` }); } else if (parsedFbaSellers === 1) { warnings.push({ level: 'warning', metric: 'Competition', message: `Only 1 FBA seller. Check PL risk.` }); } }
        // Weight
        if (!isNaN(parsedWeight)) { if (parsedWeight > WEIGHT_CRITICAL_THRESHOLD) { warnings.push({ level: 'critical', metric: 'Weight', message: `Weight (${parsedWeight} lbs) critically high (> ${WEIGHT_CRITICAL_THRESHOLD} lbs).` }); } else if (parsedWeight >= WEIGHT_WARNING_THRESHOLD) { warnings.push({ level: 'warning', metric: 'Weight', message: `Weight (${parsedWeight} lbs) high (>= ${WEIGHT_WARNING_THRESHOLD} lbs).` }); } }
        // Dimensions
        if (!['Small Standard', 'Large Standard', 'Unknown'].includes(determinedSizeTier)) { warnings.push({ level: 'warning', metric: 'Dimensions', message: `Item size tier is ${determinedSizeTier}. Check fee/handling impact.` }); }
        // Delicacy
        if (parsedDelicacy === DELICACY_CRITICAL_THRESHOLD) { warnings.push({ level: 'critical', metric: 'Delicacy', message: `Delicacy rating (${parsedDelicacy}/5) is Critically High Risk.` }); } else if (parsedDelicacy === DELICACY_WARNING_THRESHOLD) { warnings.push({ level: 'warning', metric: 'Delicacy', message: `Delicacy rating (${parsedDelicacy}/5) indicates item is fragile.` }); }
        // Amazon Sells
        if (amazonSells) { warnings.push({ level: 'warning', metric: 'Amazon Competition', message: `Amazon is selling directly!` }); }
        // Sales Trend
        if (salesTrend?.toLowerCase() === 'declining') { warnings.push({ level: 'warning', metric: 'Sales Trend', message: `Sales trend is declining.` }); }
        // Variations Count
        if (parsedVariations >= VAR_WARNING_THRESHOLD) { warnings.push({ level: 'warning', metric: 'Variations', message: `High number of variations (${parsedVariations}) (>=${VAR_WARNING_THRESHOLD}).` }); }
        // Seasonality
        if (seasonality) { warnings.push({ level: 'warning', metric: 'Seasonality', message: `Product is seasonal.` }); }
        // Advertising Cost
        if (parsedAdvertisingCost > 0) { warnings.push({ level: 'warning', metric: 'Advertising', message: `Includes $${parsedAdvertisingCost.toFixed(2)} Ad Cost per unit, affecting ROI.` }); }
        // Dangerous Goods
        if (isDangerousGood) { warnings.push({ level: 'warning', metric: 'Compliance', message: `Item flagged as Hazmat/Dangerous Good.` }); }
        // Placement Option
        if (inboundPlacementOption !== 'Optimized') { warnings.push({ level: 'warning', metric: 'Placement Fee', message: `Chosen '${inboundPlacementOption}' split incurs placement fees.` }); }
        // Est Sales/Month & TimeToSale Warnings (Critical levels trigger deal breaker)
        if (parsedSalesPerMonth !== null) {
            if(parsedSalesPerMonth < SALES_LOW_CRITICAL_THRESHOLD) { warnings.push({ level: 'critical', metric: 'Est Sales/Mo', message: `Estimated Sales (${parsedSalesPerMonth}/mo) are critically low (< ${SALES_LOW_CRITICAL_THRESHOLD}). High risk of slow turnover.` }); }
        } // If null, no warning, BSR score handles it
        if (parsedTimeToSale !== null) {
            if (parsedTimeToSale > TIME_SLOW_CRITICAL_THRESHOLD) { warnings.push({ level: 'critical', metric: 'Est Time to Sale', message: `Est. Time to Sale (${parsedTimeToSale} days) is critically long (> ${TIME_SLOW_CRITICAL_THRESHOLD} days). Capital tied up.` }); }
            else if (parsedTimeToSale > TIME_SLOW_WARN_THRESHOLD) { warnings.push({ level: 'warning', metric: 'Est Time to Sale', message: `Est. Time to Sale (${parsedTimeToSale} days) is long (> ${TIME_SLOW_WARN_THRESHOLD} days). Consider holding costs.` }); }
        } // If null, no warning
        if (parsedDiscountRebate > 0) { warnings.push({ level: 'info', metric: 'Discount/Rebate', message: `Includes $${parsedDiscountRebate.toFixed(2)} discount/rebate per unit in profit calculation.` }); }
        console.log(` -> Generated ${warnings.length} warnings.`);


        // --- 3. Calculate Weighted Score ---
        console.log("--- Step 6: Calculating Weighted Score ---");
        let rawScore = 0;
        for (const key in weights) { if (normalized.hasOwnProperty(key) && weights.hasOwnProperty(key) && weights[key] > 0) { if (typeof normalized[key] === 'number' && !isNaN(normalized[key])) { rawScore += normalized[key] * weights[key]; } else { console.warn(`Warning: Norm value for '${key}' NaN/invalid.`); } } else if (weights.hasOwnProperty(key) && weights[key] > 0) { console.warn(`Warning: Norm value missing for '${key}'.`); } }
        console.log(` -> Raw Weighted Score: ${rawScore.toFixed(1)} (Out of ${totalDefinedWeight})`);

        // --- 4. Apply Deal Breakers ---
        console.log("--- Step 7: Applying Deal Breakers ---");
        let finalScore = rawScore; let dealBreakerReason = null;
        const hasCriticalWarning = warnings.some(w => w.level === 'critical');
        if ((!isNaN(parsedWeight) && parsedWeight > WEIGHT_CRITICAL_THRESHOLD) || hasCriticalWarning || determinedSizeTier === 'Unknown') {
            finalScore = Math.min(finalScore * 0.1, 5); dealBreakerReason = "Critical warning(s), unknown size tier, or weight over 50lb.";
            if (!isNaN(parsedWeight) && parsedWeight > WEIGHT_CRITICAL_THRESHOLD && !warnings.some(w => w.metric === 'Weight' && w.level === 'critical')) { warnings.push({ level: 'critical', metric: 'Weight', message: `Weight (${parsedWeight} lbs) critically high (> ${WEIGHT_CRITICAL_THRESHOLD} lbs). Score heavily penalized.` }); }
        }
        if (roi < 0) { finalScore = 1; dealBreakerReason = (dealBreakerReason ? dealBreakerReason + " " : "") + "Negative ROI."; }
        console.log(` -> Score after deal breakers: ${finalScore.toFixed(1)}`);

        // --- 5. Scale to 1-100 and Clamp ---
        console.log("--- Step 8: Scaling and Clamping Score ---");
        finalScore = (totalDefinedWeight > 0) ? (finalScore / totalDefinedWeight) * 100 : 0;
        if (isNaN(finalScore)) { console.error("!!! Final Score is NaN before clamping!"); finalScore = 1; warnings.push({ level: 'critical', metric: 'Score', message: 'Internal calculation error resulted in invalid score.' }); }
        finalScore = Math.max(1, Math.min(100, Math.round(finalScore)));
        console.log(` -> Final Score (1-100): ${finalScore}`);

        // --- 6. AI Explanation Generation (Placeholder) ---
        const explanation = `(AI Placeholder - V35.1 Hybrid Scoring) Score ${finalScore}/100...`;

        // --- Response ---
        console.log("--- Step 9: Preparing Response Data ---");
        const responseData = {
            message: 'Score calculated successfully', score: finalScore, explanation: explanation, warnings: warnings,
            determinedSizeTier: determinedSizeTier, calculatedRoi: roi.toFixed(1), calculatedNetProfit: netProfit.toFixed(2),
            estimatedFees: estimatedFees.toFixed(2), estimatedMonthlyStorageCost: monthlyStorageCost.toFixed(2)
        };
        console.log("--- Step 10: Sending Final Response ---");
        res.status(200).json(responseData);

    } catch (error) {
        // Catch any unexpected errors in the main calculateScore logic
        console.error("!!! UNEXPECTED TOP-LEVEL ERROR in calculateScore:", error);
        res.status(500).json({ message: "Internal Server Error calculating score.", error: error.message });
    }
}; // End of exports.calculateScore


// --- Ensure mongoose is required if used anywhere else ---
// const mongoose = require('mongoose');
