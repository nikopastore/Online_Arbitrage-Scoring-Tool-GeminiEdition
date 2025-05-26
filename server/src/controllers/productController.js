// server/src/controllers/productController.js
const mongoose = require('mongoose');
// Make sure you have run: npm install paapi5-nodejs-sdk
const ProductAdvertisingAPIv1 = require('paapi5-nodejs-sdk');

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


// --- lookupProduct Function (Version 37 - PA-API with LWA Credentials) ---
exports.lookupProduct = async (req, res) => {
    const { identifier } = req.body;
    console.log("V37 lookupProduct called with identifier:", identifier);

    if (!identifier) {
        return res.status(400).json({ message: 'Product identifier (ASIN/UPC) is required.' });
    }

    const PAAPI_ACCESS_KEY = process.env.PAAPI_ACCESS_KEY;     // Your LWA Client ID
    const PAAPI_SECRET_KEY = process.env.PAAPI_SECRET_KEY;     // Your LWA Client Secret
    const PAAPI_PARTNER_TAG = process.env.PAAPI_PARTNER_TAG;      // Your Associate Tag
    const PAAPI_MARKETPLACE = 'www.amazon.com';                 // e.g., www.amazon.com
    const PAAPI_PARTNER_TYPE = 'Associates';                    // Default

    const host = PAAPI_MARKETPLACE.replace('www.', 'webservices.'); // e.g., webservices.amazon.com
    const region = 'us-east-1'; // Common for .com; adjust if your marketplace/API endpoint is different

    // Check if ANY of the critical PA-API credentials are still placeholders or missing
    if (!PAAPI_ACCESS_KEY || !PAAPI_SECRET_KEY || !PAAPI_PARTNER_TAG ||
        PAAPI_ACCESS_KEY.includes("YOUR_") || PAAPI_ACCESS_KEY.includes("YOUR") || // General check for placeholders
        PAAPI_SECRET_KEY.includes("YOUR_") || PAAPI_SECRET_KEY.includes("YOUR") ||
        PAAPI_PARTNER_TAG.includes("YOUR_") || PAAPI_PARTNER_TAG.includes("YOUR")) {
        console.warn("PA-API Credentials appear to be placeholders or are missing in .env. Using fallback data. Please verify .env content.");
        console.log("Current values from .env for PAAPI -> Key:", PAAPI_ACCESS_KEY, "Secret:", PAAPI_SECRET_KEY ? "**** (hidden)" : "MISSING", "Tag:", PAAPI_PARTNER_TAG);
        let placeholderProduct = { asin: identifier || 'FALLBACK_ASIN', title: 'Placeholder (PA-API Keys Missing/Invalid)', category: 'Unknown', sellingPrice: 55.00, weight: 2.5, dimensions: { length: 12, width: 9, height: 3 }, bsr: 75000, fbaSellers: 3, isApparel: false, variationsCount: 1, imageUrl: `https://placehold.co/200x200?text=${identifier||'No+Img'}` };
        if (identifier && identifier.toLowerCase().includes('apparel')) { placeholderProduct.isApparel = true; placeholderProduct.category = 'Clothing & Accessories'; }
        return res.status(200).json({ message: 'Product data fetched (Placeholder - PA-API Keys Missing/Invalid)', product: placeholderProduct });
    }

    try {
        console.log("Initializing PA-API client with LWA credentials...");
        const defaultClient = ProductAdvertisingAPIv1.ApiClient.instance;
        defaultClient.accessKey = PAAPI_ACCESS_KEY;
        defaultClient.secretKey = PAAPI_SECRET_KEY;
        defaultClient.host = host;
        defaultClient.region = region;
        const api = new ProductAdvertisingAPIv1.DefaultApi();
        console.log("PA-API client initialized.");

        const getItemsRequest = new ProductAdvertisingAPIv1.GetItemsRequest();
        getItemsRequest.PartnerTag = PAAPI_PARTNER_TAG;
        getItemsRequest.PartnerType = PAAPI_PARTNER_TYPE;
        getItemsRequest.Marketplace = PAAPI_MARKETPLACE;
        getItemsRequest.ItemIds = [identifier.trim()];
        getItemsRequest.ItemIdType = 'ASIN'; // Defaulting to ASIN, refine if UPCs are common
        // Requesting minimal resources to reduce chances of errors/hanging
        getItemsRequest.Resources = [
            'ItemInfo.Title',
            'Offers.Summaries.LowestPrice',
            'Images.Primary.Medium'
        ];

        console.log("Sending GetItems request to PA-API for ASIN:", identifier);
        console.log("Request Object:", JSON.stringify(getItemsRequest, null, 2)); // Log the request

        console.log(">>> BEFORE: await api.getItems(getItemsRequest)");
        const data = await api.getItems(getItemsRequest);
        console.log("<<< AFTER: await api.getItems(getItemsRequest) - Call completed.");
        
        console.log('Raw PA-API Response:', JSON.stringify(data, null, 2));

        if (data.ItemsResult && data.ItemsResult.Items && data.ItemsResult.Items.length > 0) {
            const item = data.ItemsResult.Items[0];
            // --- START PARSING LOGIC HERE (Minimal for this test) ---
            const product = {
                asin: item.ASIN || identifier,
                title: item.ItemInfo?.Title?.DisplayValue || 'N/A',
                imageUrl: item.Images?.Primary?.Medium?.URL || `https://placehold.co/200x200?text=${item.ASIN || 'No+Img'}`,
                sellingPrice: item.Offers?.Summaries?.LowestPrice?.Amount || null,
                // Add other fields as placeholders for now until full parsing
                category: 'Unknown (Parse from API)',
                bsr: null, fbaSellers: null, weight: null,
                dimensions: { length: null, width: null, height: null },
                isApparel: false, variationsCount: 1, brand: null
            };
            // --- END PARSING LOGIC ---
            console.log("Processed (Minimal) PA-API product data:", product);
            return res.status(200).json({ message: 'Product data fetched from PA-API (Minimal)', product });
        } else if (data.Errors && data.Errors.length > 0) {
            console.error('PA-API Returned Errors:', JSON.stringify(data.Errors, null, 2));
            return res.status(400).json({ message: data.Errors[0].Message || 'Error fetching from PA-API.' });
        } else {
            console.log("PA-API returned no items or unexpected structure for identifier:", identifier);
            return res.status(404).json({ message: `Product not found via PA-API: ${identifier}.` });
        }
    } catch (error) {
        console.error('PA-API Request/Processing CATCH block error:', error);
        // Log the full error object for more details, especially if it's an SDK-specific error
        if(error.status && error.response && error.response.text) { // From superagent
            console.error("Error Response Text from SDK:", error.response.text);
        }
        let errorMessage = 'Failed to fetch product data due to an unexpected error with PA-API.';
        let statusCode = 500;
        // More detailed error parsing if available from the SDK error structure
        if (error.status) { statusCode = error.status; }
        if (error.message) { errorMessage = error.message; }
        if (error.response?.data?.Errors?.[0]?.Message) { errorMessage = error.response.data.Errors[0].Message; }

        return res.status(statusCode).json({ message: errorMessage, errorDetails: error.toString() });
    }
};
// --- End lookupProduct Function ---


// --- Scoring Helper Functions (Normalization) --- V31 Definitions
// ... (All your normalize... functions from V31 - normalizeROI, normalizeBSR, normalizeCompetition, normalizeWeight, normalizeDimensions, normalizeTrend, normalizeVariationsCount, normalizeSeasonality, normalizeScale5Best) ...
const normalizeROI = (roi) => { /* ... */ };
const normalizeBSR = (bsr) => { /* ... */ };
const normalizeCompetition = (fbaSellers) => { /* ... */ };
const normalizeWeight = (unitWeight) => { /* ... */ };
const normalizeDimensions = (determinedSizeTier) => { /* ... */ };
const normalizeTrend = (trend) => { /* ... */ };
const normalizeVariationsCount = (count) => { /* ... */ };
const normalizeSeasonality = (isSeasonal) => { /* ... */ };
const normalizeScale5Best = (value) => { /* ... */ };


// --- calculateScore Function (Version 31 - Based on User's V20 + All Wt/Dim/Var fixes) ---
exports.calculateScore = async (req, res) => {
    console.log("V31 Scoring request received.");
    try {
        const { costPrice, sellingPrice, category, weight, dimensions, bsr, fbaSellers, asin, isApparel, delicacyRating = 2, amazonSells = false, salesTrend = "Stable", seasonality = false, advertisingCostPerUnit = 0, variationsCount = 1, inboundPlacementOption = 'Optimized', isDangerousGood = false } = req.body;
        let warnings = [];
        console.log("--- Step 0: Basic Validation ---");
        const parsedCostPrice = parseFloat(costPrice); const parsedSellingPrice = parseFloat(sellingPrice); const parsedAdvertisingCost = parseFloat(advertisingCostPerUnit) || 0;
        if (isNaN(parsedCostPrice) || parsedCostPrice <= 0) { return res.status(400).json({ message: 'Invalid Cost Price.' }); } if (isNaN(parsedSellingPrice) || parsedSellingPrice <= 0) { return res.status(400).json({ message: 'Invalid Selling Price.' }); } if (isNaN(parsedAdvertisingCost) || parsedAdvertisingCost < 0) { return res.status(400).json({ message: 'Invalid Advertising Cost.' }); }
        console.log("--- Step 0: Validation Passed ---");

        console.log("--- Step 1: Fee Calculation ---");
        let estimatedFees = 0; let determinedSizeTier = 'Unknown'; let fulfillmentFee = 0;
        try {
            const feeResult = calculateAmazonFees({ sellingPrice: parsedSellingPrice, category, weight: parseFloat(weight) || 0, dimensions, asin, isApparel: !!isApparel, isDangerousGood: !!isDangerousGood, inboundPlacementOption });
            if (feeResult && typeof feeResult === 'object' && feeResult.hasOwnProperty('totalEstimatedFees')) {
                 estimatedFees = feeResult.totalEstimatedFees; determinedSizeTier = feeResult.determinedSizeTier; fulfillmentFee = feeResult.fbaFee;
                 if (determinedSizeTier === 'Unknown') { warnings.push({ level: 'critical', metric: 'Fees/Size', message: 'Could not determine size tier. Fee & Dimension scoring inaccurate.' }); }
            } else { console.error("!!! calculateAmazonFees returned unexpected value:", feeResult); warnings.push({ level: 'critical', metric: 'Fees', message: 'Internal error during fee calculation (unexpected return).' }); determinedSizeTier = 'Unknown'; estimatedFees = 0; fulfillmentFee = 0; }
        } catch (error) { console.error("!!! Error occurred INSIDE calculateAmazonFees:", error); warnings.push({ level: 'critical', metric: 'Fees', message: `Internal error during fee calculation: ${error.message}` }); determinedSizeTier = 'Unknown'; estimatedFees = 0; fulfillmentFee = 0; }
        console.log(`--- Step 1: Fees processed - Tier: ${determinedSizeTier}, FulfillFee: ${fulfillmentFee}, TotalFees: ${estimatedFees}`);

        console.log("--- Step 2: Profitability Calculation ---");
        const netProfit = parsedSellingPrice - estimatedFees - parsedCostPrice - parsedAdvertisingCost;
        const roi = (parsedCostPrice > 0) ? (netProfit / parsedCostPrice) * 100 : 0;
        console.log(` -> Profit: $${netProfit.toFixed(2)}, ROI: ${roi.toFixed(2)}%`);

        console.log("--- Step 3: Storage Cost Calculation ---");
        let monthlyStorageCost = 0; /* ... logic using determinedSizeTier ... */
        console.log(` -> Est Monthly Storage: $${monthlyStorageCost.toFixed(2)}`);

        console.log("--- Step 4: Normalization ---");
        const weights = { roi: 32, bsr: 22, salesTrend: 10, delicacy: 8, variationsCount: 8, competitionCount: 8, amazonPresence: 7, weight: 4, dimensions: 3, seasonality: 4, };
        const totalDefinedWeight = 106;
        const parsedBSR = parseInt(bsr); const parsedFbaSellers = parseInt(fbaSellers); const parsedWeight = parseFloat(weight) || 0; const parsedVariations = parseInt(variationsCount) || 1; const parsedDelicacy = parseInt(delicacyRating);
        const normalized = {
            roi: normalizeROI(roi), bsr: normalizeBSR(parsedBSR), competitionCount: normalizeCompetition(parsedFbaSellers),
            weight: normalizeWeight(parsedWeight), dimensions: normalizeDimensions(determinedSizeTier),
            salesTrend: normalizeTrend(salesTrend), delicacy: normalizeScale5Best(parsedDelicacy),
            variationsCount: normalizeVariationsCount(parsedVariations), amazonPresence: amazonSells ? 0 : 1, seasonality: normalizeSeasonality(seasonality),
        };
        console.log(` -> Normalized Values: ${JSON.stringify(normalized, (k,v) => typeof v === 'number' ? v.toFixed(3) : v)}`);
        console.log(`--- DEBUG --- Input Weight: ${parsedWeight}, Normalized Weight Score: ${normalized.weight?.toFixed(2)}`);
        console.log(`--- DEBUG --- Determined Size Tier: ${determinedSizeTier}, Normalized Dimension Score: ${normalized.dimensions?.toFixed(2)}`);
        console.log(`--- DEBUG --- Input Variations: ${parsedVariations}, Normalized Variations Score: ${normalized.variationsCount?.toFixed(2)}`);

        console.log("--- Step 5: Generating Warnings ---");
        // ... (All warning logic blocks from V31) ...
        console.log(` -> Generated ${warnings.length} warnings.`);

        console.log("--- Step 6: Calculating Weighted Score ---");
        let rawScore = 0;
        for (const key in weights) { if (normalized.hasOwnProperty(key) && weights.hasOwnProperty(key) && weights[key] > 0) { if (typeof normalized[key] === 'number' && !isNaN(normalized[key])) { rawScore += normalized[key] * weights[key]; } else { console.warn(`Warning: Norm value for '${key}' NaN/invalid.`); } } else if (weights.hasOwnProperty(key) && weights[key] > 0) { console.warn(`Warning: Norm value missing for '${key}'.`); } }
        console.log(` -> Raw Weighted Score: ${rawScore.toFixed(1)} (Out of ${totalDefinedWeight})`);

        console.log("--- Step 7: Applying Deal Breakers ---");
        let finalScore = rawScore; let dealBreakerReason = null;
        const hasCriticalWarning = warnings.some(w => w.level === 'critical');
        if ((!isNaN(parsedWeight) && parsedWeight > 50) || hasCriticalWarning || determinedSizeTier === 'Unknown') { finalScore = Math.min(finalScore * 0.1, 5); dealBreakerReason = "Critical warning/Weight/Tier."; if (!isNaN(parsedWeight) && parsedWeight > 50 && !warnings.some(w => w.metric === 'Weight' && w.level === 'critical')) { warnings.push({ level: 'critical', metric: 'Weight', message: `Weight (${parsedWeight} lbs) > 50lbs. Score heavily penalized.` }); } }
        if (roi < 0) { finalScore = 1; dealBreakerReason = (dealBreakerReason ? dealBreakerReason + " " : "") + "Negative ROI."; }
        console.log(` -> Score after deal breakers: ${finalScore.toFixed(1)}`);

        console.log("--- Step 8: Scaling and Clamping Score ---");
        finalScore = (totalDefinedWeight > 0) ? (finalScore / totalDefinedWeight) * 100 : 0;
        if (isNaN(finalScore)) { console.error("!!! Final Score is NaN before clamping!"); finalScore = 1; warnings.push({ level: 'critical', metric: 'Score', message: 'Internal calculation error resulted in invalid score.' }); }
        finalScore = Math.max(1, Math.min(100, Math.round(finalScore)));
        console.log(` -> Final Score (1-100): ${finalScore}`);

        const explanation = `(AI Placeholder - V32 Corrected Final) Score ${finalScore}/100...`;
        console.log("--- Step 9: Preparing Response Data ---");
        const responseData = { message: 'Score calculated successfully', score: finalScore, explanation: explanation, warnings: warnings, determinedSizeTier: determinedSizeTier, calculatedRoi: roi.toFixed(1), calculatedNetProfit: netProfit.toFixed(2), estimatedFees: estimatedFees.toFixed(2), estimatedMonthlyStorageCost: monthlyStorageCost.toFixed(2) };
        console.log("--- Step 10: Sending Final Response ---");
        res.status(200).json(responseData);
    } catch (error) {
        console.error("!!! UNEXPECTED TOP-LEVEL ERROR in calculateScore:", error);
        res.status(500).json({ message: "Internal Server Error calculating score.", error: error.message });
    }
};