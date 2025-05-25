// server/src/controllers/productController.js
const mongoose = require('mongoose');
const ProductAdvertisingAPIv1 = require('paapi5-nodejs-sdk'); // Ensure this is installed and required

// --- Helper Function for Fee Calculation (Version 11 - Requires User Implementation) ---
// CRITICAL: USER MUST FILL IN ALL LOGIC AND VERIFY RATES/RULES HERE
const calculateAmazonFees = (productData) => {
    const { sellingPrice = 0, category = 'Unknown', weight = 0, dimensions = { length: 0, width: 0, height: 0 }, asin, isApparel = false, isDangerousGood = false, inboundPlacementOption = 'Optimized' } = productData;
    // console.log(`--- calculateAmazonFees START ---`);
    // console.log(`Input Data: Price=${sellingPrice}, Cat=${category}, Wt=${weight}, Dims=${JSON.stringify(dimensions)}, Apparel=${isApparel}, DG=${isDangerousGood}, Placement=${inboundPlacementOption}`);
    let referralFee = 0; let fbaFee = 0; let placementFee = 0; let totalEstimatedFees = 0; let determinedSizeTier = 'Unknown';
    /* --- Implement Full Fee Calculation Logic Here based on V9/V10/V11 --- */
    /* --- Ensure ALL Rates/Rules/Size Tiers Verified by User --- */
    // Example Placeholder Return (Replace with real calculation):
    // console.log("V11 calculateAmazonFees: NEEDS FULL IMPLEMENTATION & VERIFICATION!");
    referralFee = (sellingPrice * 0.15); fbaFee = 6.50; placementFee = (inboundPlacementOption === 'Minimal' ? 0.50 : 0); determinedSizeTier = 'Large Standard'; totalEstimatedFees = referralFee + fbaFee + placementFee;
    // console.log(`--- calculateAmazonFees END --- Returning: Tier=${determinedSizeTier}, FulfillFee=${fbaFee}, TotalFees=${totalEstimatedFees}`);
    return { totalEstimatedFees, determinedSizeTier, fbaFee };
};
// --- End calculateAmazonFees Function ---


// --- lookupProduct Function (Version 36 - PA-API Integration Structure) ---
exports.lookupProduct = async (req, res) => {
    const { identifier } = req.body; // ASIN or UPC
    console.log("V36 lookupProduct called with identifier:", identifier);

    if (!identifier) {
        return res.status(400).json({ message: 'Product identifier (ASIN/UPC) is required.' });
    }

    // --- PA-API Configuration ---
    const PAAPI_ACCESS_KEY = process.env.PAAPI_ACCESS_KEY;
    const PAAPI_SECRET_KEY = process.env.PAAPI_SECRET_KEY;
    const PAAPI_PARTNER_TAG = process.env.PAAPI_PARTNER_TAG;
    const PAAPI_PARTNER_TYPE = 'Associates';
    const PAAPI_MARKETPLACE = 'www.amazon.com'; // Adjust for your target marketplace
    const host = PAAPI_MARKETPLACE.replace('www.', 'webservices.');
    const region = PAAPI_MARKETPLACE === 'www.amazon.com' ? 'us-east-1' : 
                   PAAPI_MARKETPLACE === 'www.amazon.co.uk' ? 'eu-west-1' : 
                   PAAPI_MARKETPLACE === 'www.amazon.de' ? 'eu-west-1' :
                   'us-east-1'; // Default region

    if (!PAAPI_ACCESS_KEY || !PAAPI_SECRET_KEY || !PAAPI_PARTNER_TAG || PAAPI_ACCESS_KEY === "YOUR_ACTUAL_PAAPI_ACCESS_KEY" || PAAPI_ACCESS_KEY === "YOUR_ACCESS_KEY") {
        console.warn("PA-API Credentials not found or are placeholders in .env. Using fallback placeholder data.");
        let placeholderProduct = { asin: identifier || 'FALLBACK_ASIN', title: 'Placeholder Product (PA-API Keys Missing/Invalid)', category: 'Unknown', sellingPrice: 55.00, weight: 2.5, dimensions: { length: 12, width: 9, height: 3 }, bsr: 75000, fbaSellers: 3, isApparel: false, variationsCount: 1, imageUrl: `https://placehold.co/200x200?text=${identifier||'No+Img'}` };
        if (identifier && identifier.toLowerCase().includes('apparel')) { placeholderProduct.isApparel = true; placeholderProduct.category = 'Clothing & Accessories'; }
        return res.status(200).json({ message: 'Product data fetched (Placeholder - PA-API Keys Missing/Invalid)', product: placeholderProduct });
    }

    const defaultClient = ProductAdvertisingAPIv1.ApiClient.instance;
    defaultClient.accessKey = PAAPI_ACCESS_KEY;
    defaultClient.secretKey = PAAPI_SECRET_KEY;
    defaultClient.host = host;
    defaultClient.region = region;

    const api = new ProductAdvertisingAPIv1.DefaultApi();
    const getItemsRequest = new ProductAdvertisingAPIv1.GetItemsRequest();
    getItemsRequest.PartnerTag = PAAPI_PARTNER_TAG;
    getItemsRequest.PartnerType = PAAPI_PARTNER_TYPE;
    getItemsRequest.Marketplace = PAAPI_MARKETPLACE;
    getItemsRequest.ItemIds = [identifier.trim()];

    if (/^[0-9]{10}$|^[0-9]{12}$|^[0-9]{13}$/.test(identifier.trim())) {
        getItemsRequest.ItemIdType = 'UPC';
        if (identifier.trim().length === 10 && (identifier.trim().toUpperCase().startsWith('B') || /^[0-9]{9}[X0-9]$/.test(identifier.trim().toUpperCase()))) {
            getItemsRequest.ItemIdType = 'ASIN';
        }
    } else {
        getItemsRequest.ItemIdType = 'ASIN';
    }

    getItemsRequest.Resources = [
        'Images.Primary.Medium', 'ItemInfo.Title', 'ItemInfo.ByLineInfo',
        'ItemInfo.Classifications', 'ItemInfo.ProductInfo', 'ItemInfo.ManufactureInfo',
        'Offers.Summaries.LowestPrice', 'Offers.Summaries.OfferCount',
        'BrowseNodes.Ancestor', 'BrowseNodes.SalesRank'
    ];

    try {
        console.log("Sending GetItems request to PA-API with ItemIdType:", getItemsRequest.ItemIdType, "for IDs:", getItemsRequest.ItemIds);
        const data = await api.getItems(getItemsRequest);
        
        console.log('Raw PA-API Response:', JSON.stringify(data, null, 2)); // <<< CRUCIAL LOG

        if (data.ItemsResult && data.ItemsResult.Items && data.ItemsResult.Items.length > 0) {
            const item = data.ItemsResult.Items[0];
            
            // --- START PARSING LOGIC HERE ---
            // YOU WILL NEED TO ADJUST THESE PATHS BASED ON THE RAW RESPONSE
            let salesRank = null;
            if (item.BrowseNodeInfo?.BrowseNodes) {
                for (const node of item.BrowseNodeInfo.BrowseNodes) { if (node.SalesRank) { salesRank = parseInt(node.SalesRank); break; } }
            }
            if (salesRank === null && item.ItemInfo?.Classifications?.SalesRank?.DisplayValue) { salesRank = parseInt(item.ItemInfo.Classifications.SalesRank.DisplayValue.replace(/[^0-9]/g, '')); }

            let categoryName = item.BrowseNodeInfo?.BrowseNodes?.[0]?.DisplayName || item.ItemInfo?.Classifications?.ProductGroup?.DisplayValue || 'Unknown';

            const product = {
                asin: item.ASIN || identifier,
                title: item.ItemInfo?.Title?.DisplayValue || 'N/A',
                imageUrl: item.Images?.Primary?.Medium?.URL || `https://placehold.co/200x200?text=${item.ASIN || 'No+Img'}`,
                sellingPrice: item.Offers?.Summaries?.LowestPrice?.Amount || null,
                category: categoryName,
                bsr: salesRank,
                fbaSellers: item.Offers?.Summaries?.[0]?.OfferCount || null, // Total new offers
                weight: item.ItemInfo?.ProductInfo?.ItemWeight?.Value || null,
                weightUnit: item.ItemInfo?.ProductInfo?.ItemWeight?.Unit || null,
                dimensions: {
                    length: item.ItemInfo?.ProductInfo?.ItemDimensions?.Length?.Value || null,
                    width: item.ItemInfo?.ProductInfo?.ItemDimensions?.Width?.Value || null,
                    height: item.ItemInfo?.ProductInfo?.ItemDimensions?.Height?.Value || null,
                    unit: item.ItemInfo?.ProductInfo?.ItemDimensions?.Length?.Unit || null
                },
                isApparel: categoryName.toLowerCase().includes('apparel') || categoryName.toLowerCase().includes('clothing') || false,
                variationsCount: 1, // Placeholder
                brand: item.ItemInfo?.ByLineInfo?.Brand?.DisplayValue || item.ItemInfo?.ManufactureInfo?.Manufacturer?.DisplayValue || null
            };

            // --- Unit Conversions ---
            if (product.weight && product.weightUnit) { /* ... conversion logic ... */ }
            if (product.dimensions && product.dimensions.unit) { /* ... conversion logic ... */ }
            if (typeof product.bsr === 'string') product.bsr = parseInt(product.bsr.replace(/[^0-9]/g, ''));
            // --- END PARSING LOGIC ---

            console.log("Processed PA-API product data:", product);
            return res.status(200).json({ message: 'Product data fetched from PA-API', product });
        } else if (data.Errors && data.Errors.length > 0) { /* ... error handling ... */ }
        else { /* ... error handling ... */ }

    } catch (error) { /* ... error handling ... */ }
};
// --- End lookupProduct Function ---


// --- Scoring Helper Functions (Normalization) --- V34 Definitions
const normalizeROI = (roi) => { /* ... As in V34 ... */ };
const normalizeCompetition = (fbaSellers) => { /* ... As in V34 ... */ };
const normalizeWeight = (unitWeight) => { /* ... As in V34 ... */ };
const normalizeDimensions = (determinedSizeTier) => { /* ... As in V34 ... */ };
const normalizeTrend = (trend) => { /* ... As in V34 ... */ };
const normalizeVariationsCount = (count) => { /* ... As in V34 ... */ };
const normalizeSeasonality = (isSeasonal) => { /* ... As in V34 ... */ };
const normalizeScale5Best = (value) => { /* ... As in V34 ... */ };
const normalizeSalesPerMonth = (sales) => { /* ... As in V34 ... */ };
const normalizeTimeToSale = (days) => { /* ... As in V34 ... */ };


// --- calculateScore Function (Version 34 - Based on User's V31 + Optional Metrics) ---
exports.calculateScore = async (req, res) => {
    // Wrap main logic in try-catch
    try {
        // Destructure inputs - Added new optional fields
        const { costPrice, sellingPrice, category, weight, dimensions, bsr, fbaSellers, asin, isApparel, delicacyRating = 3, amazonSells = false, salesTrend = "Stable", seasonality = false, advertisingCostPerUnit = 0, variationsCount = 1, inboundPlacementOption = 'Optimized', isDangerousGood = false, estimatedSalesPerMonth = null, estimatedTimeToSale = null, supplierDiscountRebate = 0 } = req.body;
        console.log("V34 Scoring request received."); // Keep version consistent with scoring logic
        let warnings = [];

        // --- Basic Validation ---
        console.log("--- Step 0: Basic Validation ---");
        // ... (Validation logic from V34) ...
        const parsedCostPrice = parseFloat(costPrice); const parsedSellingPrice = parseFloat(sellingPrice); const parsedAdvertisingCost = parseFloat(advertisingCostPerUnit) || 0; const parsedDiscountRebate = parseFloat(supplierDiscountRebate) || 0; const parsedSalesPerMonth = estimatedSalesPerMonth !== null ? parseInt(estimatedSalesPerMonth) : null; const parsedTimeToSale = estimatedTimeToSale !== null ? parseInt(estimatedTimeToSale) : null;
        if (isNaN(parsedCostPrice) || parsedCostPrice <= 0) { return res.status(400).json({ message: 'Invalid Cost Price.' }); } if (isNaN(parsedSellingPrice) || parsedSellingPrice <= 0) { return res.status(400).json({ message: 'Invalid Selling Price.' }); } if (isNaN(parsedAdvertisingCost) || parsedAdvertisingCost < 0) { return res.status(400).json({ message: 'Invalid Advertising Cost.' }); } if (isNaN(parsedDiscountRebate) || parsedDiscountRebate < 0) { return res.status(400).json({ message: 'Invalid Supplier Discount/Rebate.' }); } if (parsedSalesPerMonth !== null && (isNaN(parsedSalesPerMonth) || parsedSalesPerMonth < 0)) { return res.status(400).json({ message: 'Invalid Estimated Sales Per Month.' }); } if (parsedTimeToSale !== null && (isNaN(parsedTimeToSale) || parsedTimeToSale < 0)) { return res.status(400).json({ message: 'Invalid Estimated Time To Sale.' }); }
        console.log("--- Step 0: Validation Passed ---");


        // --- Fee Calculation ---
        console.log("--- Step 1: Fee Calculation ---");
        let estimatedFees = 0; let determinedSizeTier = 'Unknown'; let fulfillmentFee = 0;
        try { /* ... call calculateAmazonFees from V34 ... */ } catch (error) { /* ... handle errors ... */ }
        console.log(` -> Fees Processed: Tier=${determinedSizeTier}, FulfillFee=${fulfillmentFee}, TotalFees=${estimatedFees}`);

        // --- Profitability Calculation (Includes Ad Cost AND Discount/Rebate) ---
        console.log("--- Step 2: Profitability Calculation ---");
        const netProfit = parsedSellingPrice - estimatedFees - parsedCostPrice - parsedAdvertisingCost + parsedDiscountRebate;
        const roi = (parsedCostPrice > 0) ? (netProfit / parsedCostPrice) * 100 : 0;
        console.log(` -> Profit: $${netProfit.toFixed(2)}, ROI: ${roi.toFixed(2)}%`);

        // --- Monthly Storage Cost Calculation ---
        console.log("--- Step 3: Storage Cost Calculation ---");
        let monthlyStorageCost = 0; /* ... logic ... */
        console.log(` -> Est Monthly Storage: $${monthlyStorageCost.toFixed(2)}`);

        // ===================================
        // === SCORING LOGIC (Matches V34) ===
        // ===================================
        console.log("--- Step 4: Normalization ---");
        // --- 1. Define Weights ---
        const weights = { roi: 27, salesPerMonth: 22, timeToSale: 5, salesTrend: 10, delicacy: 8, variationsCount: 8, competitionCount: 8, amazonPresence: 7, weight: 4, dimensions: 3, seasonality: 4, };
        const totalDefinedWeight = 111;
        console.log(` -> Total Defined Weight: ${totalDefinedWeight}`);

        // --- 2. Normalize Metrics ---
        const parsedBSR = parseInt(bsr); const parsedFbaSellers = parseInt(fbaSellers); const parsedWeight = parseFloat(weight) || 0; const parsedVariations = parseInt(variationsCount) || 1; const parsedDelicacy = parseInt(delicacyRating);
        const normalized = {
            roi: normalizeROI(roi), salesPerMonth: normalizeSalesPerMonth(parsedSalesPerMonth), timeToSale: normalizeTimeToSale(parsedTimeToSale),
            competitionCount: normalizeCompetition(parsedFbaSellers), weight: normalizeWeight(parsedWeight), dimensions: normalizeDimensions(determinedSizeTier),
            salesTrend: normalizeTrend(salesTrend), delicacy: normalizeScale5Best(parsedDelicacy), variationsCount: normalizeVariationsCount(parsedVariations),
            amazonPresence: amazonSells ? 0 : 1, seasonality: normalizeSeasonality(seasonality),
        };
        console.log(` -> Normalized Values: ${JSON.stringify(normalized, (k,v) => typeof v === 'number' ? v.toFixed(3) : v)}`);
        // Debug Logs
        console.log(`--- DEBUG --- Input Sales/Mo: ${parsedSalesPerMonth}, Normalized Sales Score: ${normalized.salesPerMonth?.toFixed(2)}`);
        console.log(`--- DEBUG --- Input TimeToSale: ${parsedTimeToSale}, Normalized TTS Score: ${normalized.timeToSale?.toFixed(2)}`);

        // --- Generate Warnings ---
        console.log("--- Step 5: Generating Warnings ---");
        // ... (All warning logic blocks using defined thresholds from V34) ...
        console.log(` -> Generated ${warnings.length} warnings.`);

        // --- Calculate Weighted Score ---
        console.log("--- Step 6: Calculating Weighted Score ---");
        let rawScore = 0;
        // ... (Summation loop from V34) ...
        console.log(` -> Raw Weighted Score: ${rawScore.toFixed(1)} (Out of ${totalDefinedWeight})`);

        // --- Apply Deal Breakers ---
        console.log("--- Step 7: Applying Deal Breakers ---");
        let finalScore = rawScore; let dealBreakerReason = null;
        // ... (Deal breaker logic from V34) ...
        console.log(` -> Score after deal breakers: ${finalScore.toFixed(1)}`);

        // --- Scale to 1-100 and Clamp ---
        console.log("--- Step 8: Scaling and Clamping Score ---");
        finalScore = (totalDefinedWeight > 0) ? (finalScore / totalDefinedWeight) * 100 : 0;
        // ... (NaN check and clamping from V34) ...
        console.log(` -> Final Score (1-100): ${finalScore}`);

        // --- AI Explanation Generation (Placeholder) ---
        const explanation = `(AI Placeholder - V36 Full PA-API Structure) Score ${finalScore}/100...`;

        // --- Response ---
        console.log("--- Step 9: Preparing Response Data ---");
        const responseData = { message: 'Score calculated successfully', score: finalScore, explanation: explanation, warnings: warnings, determinedSizeTier: determinedSizeTier, calculatedRoi: roi.toFixed(1), calculatedNetProfit: netProfit.toFixed(2), estimatedFees: estimatedFees.toFixed(2), estimatedMonthlyStorageCost: monthlyStorageCost.toFixed(2) };
        console.log("--- Step 10: Sending Final Response ---");
        res.status(200).json(responseData);

    } catch (error) {
        console.error("!!! UNEXPECTED TOP-LEVEL ERROR in calculateScore:", error);
        res.status(500).json({ message: "Internal Server Error calculating score.", error: error.message });
    }
}; // End of exports.calculateScore