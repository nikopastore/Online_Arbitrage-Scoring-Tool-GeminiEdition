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

    if (!PAAPI_ACCESS_KEY || !PAAPI_SECRET_KEY || !PAAPI_PARTNER_TAG ||
        PAAPI_ACCESS_KEY === "YOUR_ACTUAL_PAAPI_ACCESS_KEY" || // Check against old placeholder
        PAAPI_ACCESS_KEY.startsWith("YOUR_") || PAAPI_ACCESS_KEY.startsWith("amzn1.application-oa2-client.YOUR")) { // Check against new placeholder format
        console.warn("PA-API Credentials appear to be placeholders or are missing in .env. Using fallback data.");
        // Fallback logic from V36
        let placeholderProduct = { asin: identifier || 'FALLBACK_ASIN', title: 'Placeholder Product (PA-API Keys Missing/Invalid)', category: 'Unknown', sellingPrice: 55.00, weight: 2.5, dimensions: { length: 12, width: 9, height: 3 }, bsr: 75000, fbaSellers: 3, isApparel: false, variationsCount: 1, imageUrl: `https://placehold.co/200x200?text=${identifier||'No+Img'}` };
        if (identifier && identifier.toLowerCase().includes('apparel')) { placeholderProduct.isApparel = true; placeholderProduct.category = 'Clothing & Accessories'; }
        return res.status(200).json({ message: 'Product data fetched (Placeholder - PA-API Keys Missing/Invalid)', product: placeholderProduct });
    }

    try {
        console.log("Initializing PA-API client with LWA credentials...");
        const defaultClient = ProductAdvertisingAPIv1.ApiClient.instance;
        defaultClient.accessKey = PAAPI_ACCESS_KEY;   // This is your LWA Client ID
        defaultClient.secretKey = PAAPI_SECRET_KEY;   // This is your LWA Client Secret
        defaultClient.host = host;
        defaultClient.region = region;
        // For LWA, the SDK might need a refresh token if it's not handling the initial token exchange.
        // However, often it can use client_id & client_secret to obtain the token directly.
        // If it requires a refresh token, you'd set it like: defaultClient.refreshToken = process.env.PAAPI_REFRESH_TOKEN;
        // For now, we assume the SDK attempts token exchange with Client ID/Secret.

        const api = new ProductAdvertisingAPIv1.DefaultApi();
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
        console.log("Request Object:", JSON.stringify(getItemsRequest, null, 2));

        const data = await api.getItems(getItemsRequest);

        console.log("<<< SUCCESSFULLY RECEIVED Raw PA-API Response >>>");
        console.log(JSON.stringify(data, null, 2)); // Log the full raw response

        if (data.ItemsResult && data.ItemsResult.Items && data.ItemsResult.Items.length > 0) {
            const item = data.ItemsResult.Items[0];
            const product = {
                asin: item.ASIN || identifier,
                title: item.ItemInfo?.Title?.DisplayValue || 'N/A',
                imageUrl: item.Images?.Primary?.Medium?.URL || `https://placehold.co/200x200?text=${item.ASIN || 'No+Img'}`,
                sellingPrice: item.Offers?.Summaries?.LowestPrice?.Amount || null,
                // --- You will need to add parsing for other fields based on the raw response ---
                // --- and the resources you request (BSR, Category, Weight, Dims etc.) ---
                category: 'Unknown (Parse from API)',
                bsr: null, // Placeholder
                fbaSellers: null, // Placeholder
                weight: null, // Placeholder
                dimensions: { length: null, width: null, height: null }, // Placeholder
                isApparel: false, // Placeholder
                variationsCount: 1, // Placeholder
                brand: null // Placeholder
            };
            console.log("Processed (Minimal) PA-API product data:", product);
            return res.status(200).json({ message: 'Product data fetched from PA-API (Minimal)', product });
        } else if (data.Errors && data.Errors.length > 0) {
            console.error('PA-API Errors:', JSON.stringify(data.Errors, null, 2));
            return res.status(400).json({ message: data.Errors[0].Message || 'Error fetching from PA-API.' });
        } else {
            console.log("PA-API returned no items or unexpected structure for identifier:", identifier);
            return res.status(404).json({ message: `Product not found via PA-API: ${identifier}.` });
        }
    } catch (error) {
        console.error('PA-API Request/Processing CATCH block error:', error);
        let errorMessage = 'Failed to fetch product data due to an unexpected error with PA-API.';
        let statusCode = 500;
        if (error.status) { // SDK specific error structure
            statusCode = error.status;
            errorMessage = error.message || `PA-API request failed with status ${error.status}.`;
            if (error.response && error.response.data && error.response.data.Errors && error.response.data.Errors.length > 0) {
                errorMessage = error.response.data.Errors[0].Message;
            }
        } else if (error.message) {
            errorMessage = error.message;
        }
        return res.status(statusCode).json({ message: errorMessage, errorDetails: error.toString() });
    }
};
// --- End lookupProduct Function ---


// --- Scoring Helper Functions (Normalization) --- V31 Definitions
const normalizeROI = (roi) => { /* ...As in V31 ... */ };
const normalizeBSR = (bsr) => { /* ...As in V31 ... */ }; // This will be less used if salesPerMonth is primary
const normalizeCompetition = (fbaSellers) => { /* ...As in V31 ... */ };
const normalizeWeight = (unitWeight) => { /* ...As in V31 with adjusted steps... */ };
const normalizeDimensions = (determinedSizeTier) => { /* ...As in V31 ... */ };
const normalizeTrend = (trend) => { /* ...As in V31 ... */ };
const normalizeVariationsCount = (count) => { /* ...As in V31 ... */ };
const normalizeSeasonality = (isSeasonal) => { /* ...As in V31 ... */ };
const normalizeScale5Best = (value) => { /* ...As in V31 ... */ }; // For Delicacy


// --- calculateScore Function (Version 31 - Based on User's V20 + All Wt/Dim/Var fixes) ---
exports.calculateScore = async (req, res) => {
    console.log("V31 Scoring request received.");
    // Wrap main logic in try-catch to guarantee a response
    try {
        // Destructure inputs (Matches V20 + advertisingCostPerUnit)
        const { costPrice, sellingPrice, category, weight, dimensions, bsr, fbaSellers, asin, isApparel, delicacyRating = 2, amazonSells = false, salesTrend = "Stable", seasonality = false, advertisingCostPerUnit = 0,
                 variationsCount = 1, inboundPlacementOption = 'Optimized', isDangerousGood = false } = req.body;
        let warnings = [];

        // --- Basic Validation ---
        console.log("--- Step 0: Basic Validation ---");
        const parsedCostPrice = parseFloat(costPrice); const parsedSellingPrice = parseFloat(sellingPrice); const parsedAdvertisingCost = parseFloat(advertisingCostPerUnit) || 0;
        if (isNaN(parsedCostPrice) || parsedCostPrice <= 0) { return res.status(400).json({ message: 'Invalid Cost Price.' }); } if (isNaN(parsedSellingPrice) || parsedSellingPrice <= 0) { return res.status(400).json({ message: 'Invalid Selling Price.' }); } if (isNaN(parsedAdvertisingCost) || parsedAdvertisingCost < 0) { return res.status(400).json({ message: 'Invalid Advertising Cost.' }); }
        console.log("--- Step 0: Validation Passed ---");

        // --- Fee Calculation (Wrapped in try-catch) ---
        console.log("--- Step 1: Fee Calculation ---");
        let estimatedFees = 0; let determinedSizeTier = 'Unknown'; let fulfillmentFee = 0;
        try {
            const feeResult = calculateAmazonFees({ sellingPrice: parsedSellingPrice, category, weight: parseFloat(weight) || 0, dimensions, asin, isApparel: !!isApparel, isDangerousGood: !!isDangerousGood, inboundPlacementOption });
            // console.log("--- Step 1: Returned from calculateAmazonFees ---", feeResult);
            if (feeResult && typeof feeResult === 'object' && feeResult.hasOwnProperty('totalEstimatedFees')) {
                 estimatedFees = feeResult.totalEstimatedFees; determinedSizeTier = feeResult.determinedSizeTier; fulfillmentFee = feeResult.fbaFee;
                 console.log(`--- Step 1: Fees processed - Tier: ${determinedSizeTier}, FulfillFee: ${fulfillmentFee}, TotalFees: ${estimatedFees}`);
                 if (determinedSizeTier === 'Unknown') { warnings.push({ level: 'critical', metric: 'Fees/Size', message: 'Could not determine size tier. Fee & Dimension scoring inaccurate.' }); }
            } else { console.error("!!! calculateAmazonFees returned unexpected value:", feeResult); warnings.push({ level: 'critical', metric: 'Fees', message: 'Internal error during fee calculation (unexpected return).' }); determinedSizeTier = 'Unknown'; estimatedFees = 0; fulfillmentFee = 0; }
        } catch (error) { console.error("!!! Error occurred INSIDE calculateAmazonFees:", error); warnings.push({ level: 'critical', metric: 'Fees', message: `Internal error during fee calculation: ${error.message}` }); determinedSizeTier = 'Unknown'; estimatedFees = 0; fulfillmentFee = 0; }

        // --- Profitability Calculation (Includes Ad Cost) ---
        console.log("--- Step 2: Profitability Calculation ---");
        const netProfit = parsedSellingPrice - estimatedFees - parsedCostPrice - parsedAdvertisingCost;
        const roi = (parsedCostPrice > 0) ? (netProfit / parsedCostPrice) * 100 : 0;
        console.log(` -> Profit: $${netProfit.toFixed(2)}, ROI: ${roi.toFixed(2)}%`);

        // --- Monthly Storage Cost Calculation ---
        console.log("--- Step 3: Storage Cost Calculation ---");
        let monthlyStorageCost = 0; /* ... logic using determinedSizeTier ... */
        console.log(` -> Est Monthly Storage: $${monthlyStorageCost.toFixed(2)}`);

        // ===================================
        // === SCORING LOGIC (Based on User's V20 + Wt/Dim/Var fixes) ===
        // ===================================
        console.log("--- Step 4: Normalization ---");
        // --- 1. Define Weights (Split weightSize, Total=106) ---
        const weights = {
            roi: 32, bsr: 22, salesTrend: 10, delicacy: 8, variationsCount: 8,
            competitionCount: 8, amazonPresence: 7,
            weight: 4, // Direct weight score
            dimensions: 3, // Direct dimension/tier score
            seasonality: 4,
        };
        const totalDefinedWeight = 106; // Sum of correct weights
        console.log(` -> Total Defined Weight: ${totalDefinedWeight}`);

        // --- 2. Normalize Metrics ---
        const parsedBSR = parseInt(bsr); const parsedFbaSellers = parseInt(fbaSellers);
        const parsedWeight = parseFloat(weight) || 0;
        const parsedVariations = parseInt(variationsCount) || 1;
        const parsedDelicacy = parseInt(delicacyRating);

        // *** Calls CORRECTED normalization functions ***
        const normalized = {
            roi: normalizeROI(roi),
            bsr: normalizeBSR(parsedBSR),
            competitionCount: normalizeCompetition(parsedFbaSellers),
            weight: normalizeWeight(parsedWeight),
            dimensions: normalizeDimensions(determinedSizeTier),
            salesTrend: normalizeTrend(salesTrend),
            delicacy: normalizeScale5Best(parsedDelicacy),
            variationsCount: normalizeVariationsCount(parsedVariations),
            amazonPresence: amazonSells ? 0 : 1,
            seasonality: normalizeSeasonality(seasonality),
        };
        console.log(` -> Normalized Values: ${JSON.stringify(normalized, (k,v) => typeof v === 'number' ? v.toFixed(3) : v)}`);
        // Debug Logs for Weight/Dimension Normalization
        console.log(`--- DEBUG --- Input Weight: ${parsedWeight}, Normalized Weight Score: ${normalized.weight?.toFixed(2)}`);
        console.log(`--- DEBUG --- Determined Size Tier: ${determinedSizeTier}, Normalized Dimension Score: ${normalized.dimensions?.toFixed(2)}`);
        console.log(`--- DEBUG --- Input Variations: ${parsedVariations}, Normalized Variations Score: ${normalized.variationsCount?.toFixed(2)}`);


        // --- Generate Warnings (Using User-Defined Thresholds & Updated Logic) ---
        console.log("--- Step 5: Generating Warnings ---");
        // ... (All warning logic blocks as defined and updated previously) ...
        const ROI_CRITICAL_THRESHOLD = 15; const ROI_WARNING_THRESHOLD = 20; if (roi < ROI_CRITICAL_THRESHOLD) { warnings.push({ level: 'critical', metric: 'ROI', message: `ROI (${roi.toFixed(1)}%) critically low (<${ROI_CRITICAL_THRESHOLD}%).` }); } else if (roi < ROI_WARNING_THRESHOLD) { warnings.push({ level: 'warning', metric: 'ROI', message: `ROI (${roi.toFixed(1)}%) low (${ROI_CRITICAL_THRESHOLD}-${ROI_WARNING_THRESHOLD}%).` }); }
        const BSR_CRITICAL_THRESHOLD = 150000; const BSR_WARNING_THRESHOLD = 100000; if (!isNaN(parsedBSR) && parsedBSR > BSR_CRITICAL_THRESHOLD) { warnings.push({ level: 'critical', metric: 'BSR', message: `BSR (${parsedBSR}) critically high (>${BSR_CRITICAL_THRESHOLD}).` }); } else if (!isNaN(parsedBSR) && parsedBSR > BSR_WARNING_THRESHOLD) { warnings.push({ level: 'warning', metric: 'BSR', message: `BSR (${parsedBSR}) high (${BSR_WARNING_THRESHOLD}-${BSR_CRITICAL_THRESHOLD}).` }); }
        const COMP_CRITICAL_THRESHOLD = 18; const COMP_WARNING_THRESHOLD = 12; if (!isNaN(parsedFbaSellers)) { if (parsedFbaSellers > COMP_CRITICAL_THRESHOLD) { warnings.push({ level: 'critical', metric: 'Competition', message: `Competition (${parsedFbaSellers} FBA) critically high (>${COMP_CRITICAL_THRESHOLD}).` }); } else if (parsedFbaSellers > COMP_WARNING_THRESHOLD) { warnings.push({ level: 'warning', metric: 'Competition', message: `Competition (${parsedFbaSellers} FBA) high (${COMP_WARNING_THRESHOLD + 1}-${COMP_CRITICAL_THRESHOLD}).` }); } else if (parsedFbaSellers === 1) { warnings.push({ level: 'warning', metric: 'Competition', message: `Only 1 FBA seller. Check PL risk.` }); } }
        const WEIGHT_CRITICAL_THRESHOLD = 50; const WEIGHT_WARNING_THRESHOLD = 20; if (!isNaN(parsedWeight)) { if (parsedWeight > WEIGHT_CRITICAL_THRESHOLD) { warnings.push({ level: 'critical', metric: 'Weight', message: `Weight (${parsedWeight} lbs) critically high (> ${WEIGHT_CRITICAL_THRESHOLD} lbs).` }); } else if (parsedWeight >= WEIGHT_WARNING_THRESHOLD) { warnings.push({ level: 'warning', metric: 'Weight', message: `Weight (${parsedWeight} lbs) high (>= ${WEIGHT_WARNING_THRESHOLD} lbs).` }); } }
        if (determinedSizeTier !== 'Unknown' && !(determinedSizeTier === 'Small Standard' || determinedSizeTier === 'Large Standard')) { warnings.push({ level: 'warning', metric: 'Dimensions', message: `Item size tier is ${determinedSizeTier}. Check fee/handling impact.` }); }
        const DELICACY_CRITICAL_THRESHOLD = 1; const DELICACY_WARNING_THRESHOLD = 2; if (parsedDelicacy === DELICACY_CRITICAL_THRESHOLD) { warnings.push({ level: 'critical', metric: 'Delicacy', message: `Delicacy rating (${parsedDelicacy}/5) is Critically High Risk.` }); } else if (parsedDelicacy === DELICACY_WARNING_THRESHOLD) { warnings.push({ level: 'warning', metric: 'Delicacy', message: `Delicacy rating (${parsedDelicacy}/5) indicates item is fragile.` }); }
        if (amazonSells) { warnings.push({ level: 'warning', metric: 'Amazon Competition', message: `Amazon is selling directly!` }); }
        if (salesTrend?.toLowerCase() === 'declining') { warnings.push({ level: 'warning', metric: 'Sales Trend', message: `Sales trend is declining.` }); }
        const VAR_WARNING_THRESHOLD = 20; if (parsedVariations >= VAR_WARNING_THRESHOLD) { warnings.push({ level: 'warning', metric: 'Variations', message: `High number of variations (${parsedVariations}) (>=${VAR_WARNING_THRESHOLD}).` }); }
        if (seasonality) { warnings.push({ level: 'warning', metric: 'Seasonality', message: `Product is seasonal.` }); }
        if (parsedAdvertisingCost > 0) { warnings.push({ level: 'warning', metric: 'Advertising', message: `Includes $${parsedAdvertisingCost.toFixed(2)} Ad Cost per unit, affecting ROI.` }); }
        if (isDangerousGood) { warnings.push({ level: 'warning', metric: 'Compliance', message: `Item flagged as Hazmat/Dangerous Good.` }); }
        if (inboundPlacementOption !== 'Optimized') { warnings.push({ level: 'warning', metric: 'Placement Fee', message: `Chosen '${inboundPlacementOption}' split incurs placement fees.` }); }
        console.log(` -> Generated ${warnings.length} warnings.`);

        // --- 3. Calculate Weighted Score --- *** ADDED ROBUSTNESS CHECK ***
        let rawScore = 0;
        console.log("--- Step 6: Calculating Weighted Score ---");
        for (const key in weights) {
            if (normalized.hasOwnProperty(key) && weights.hasOwnProperty(key) && weights[key] > 0) {
                if (typeof normalized[key] === 'number' && !isNaN(normalized[key])) {
                     rawScore += normalized[key] * weights[key];
                } else { console.warn(`Warning: Normalized value for metric '${key}' is NaN or invalid.`); }
            } else if (weights.hasOwnProperty(key) && weights[key] > 0) { console.warn(`Warning: Normalized value missing for weighted metric '${key}'.`); }
        }
        console.log(` -> Raw Weighted Score: ${rawScore.toFixed(1)} (Out of ${totalDefinedWeight})`);

        // --- 4. Apply Deal Breakers --- *** UPDATED ***
        console.log("--- Step 7: Applying Deal Breakers ---");
        let finalScore = rawScore; let dealBreakerReason = null;
        const hasCriticalWarning = warnings.some(w => w.level === 'critical');
         // Apply penalty if weight > 50 OR other critical warnings exist OR tier is unknown
        if ((!isNaN(parsedWeight) && parsedWeight > WEIGHT_CRITICAL_THRESHOLD) || hasCriticalWarning || determinedSizeTier === 'Unknown') {
            finalScore = Math.min(finalScore * 0.1, 5); // Apply penalty
            dealBreakerReason = "Critical warning(s), unknown size tier, or weight over 50lb.";
            if (!isNaN(parsedWeight) && parsedWeight > WEIGHT_CRITICAL_THRESHOLD && !warnings.some(w => w.metric === 'Weight' && w.level === 'critical')) { warnings.push({ level: 'critical', metric: 'Weight', message: `Weight (${parsedWeight} lbs) critically high (> ${WEIGHT_CRITICAL_THRESHOLD} lbs). Score heavily penalized.` }); }
        }
        if (roi < 0) { finalScore = 1; dealBreakerReason = (dealBreakerReason ? dealBreakerReason + " " : "") + "Negative ROI."; }
        console.log(` -> Score after deal breakers: ${finalScore.toFixed(1)}`);

        // --- 5. Scale to 1-100 and Clamp --- *** CORRECTED ***
        console.log("--- Step 8: Scaling and Clamping Score ---");
        finalScore = (totalDefinedWeight > 0) ? (finalScore / totalDefinedWeight) * 100 : 0; // Use correct total weight
        if (isNaN(finalScore)) { console.error("!!! Final Score is NaN before clamping!"); finalScore = 1; warnings.push({ level: 'critical', metric: 'Score', message: 'Internal calculation error resulted in invalid score.' }); }
        finalScore = Math.max(1, Math.min(100, Math.round(finalScore)));
        console.log(` -> Final Score (1-100): ${finalScore}`);

        // --- 6. AI Explanation Generation (Placeholder) ---
        const explanation = `(AI Placeholder - V33 Corrected Final) Score ${finalScore}/100...`;

        // --- Response ---
        console.log("--- Step 9: Preparing Response Data ---");
        const responseData = {
            message: 'Score calculated successfully', score: finalScore, explanation: explanation, warnings: warnings,
            determinedSizeTier: determinedSizeTier, calculatedRoi: roi.toFixed(1), calculatedNetProfit: netProfit.toFixed(2),
            estimatedFees: estimatedFees.toFixed(2), estimatedMonthlyStorageCost: monthlyStorageCost.toFixed(2)
        };
        // console.log("--- DEBUG --- Data being sent in response:", JSON.stringify(responseData, null, 2));
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