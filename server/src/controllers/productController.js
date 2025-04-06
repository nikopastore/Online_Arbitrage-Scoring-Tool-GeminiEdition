// server/src/controllers/productController.js

// --- Helper Function for Fee Calculation (Version 10 - Filled Rates Based on Images) ---
// Incorporates Referral, FBA Fulfillment (4 types), FBA Inbound Placement, and Accurate Size Tiers
const calculateAmazonFees = (productData) => {
    const {
        sellingPrice = 0, category = 'Unknown', weight = 0, // Unit weight in lbs
        dimensions = { length: 0, width: 0, height: 0 }, // Dimensions in inches
        asin, isApparel = false, isDangerousGood = false,
        inboundPlacementOption = 'Optimized'
    } = productData;

    console.log(`V10 Calculating fees for ASIN: ${asin || 'N/A'} - Price: $${sellingPrice}, Cat: ${category}, Unit Wt: ${weight} lbs, Dims: L${dimensions.length}"xW${dimensions.width}"xH${dimensions.height}", Apparel: ${isApparel}, Placement: ${inboundPlacementOption}`);

    let referralFee = 0;
    let fbaFee = 0; // Fulfillment Fee
    let placementFee = 0; // Inbound Placement Fee
    let totalEstimatedFees = 0;
    let determinedSizeTier = 'Unknown';

    // --- 1. Referral Fee Calculation ---
    if (sellingPrice > 0) {
        // ** USER VERIFICATION NEEDED: Verify ALL category rates & minimum from official source **
        const referralRateMap = {
            'Electronics': 0.08, // Example
            'Home & Kitchen': 0.15, // Example
            'Toys & Games': 0.15, // Example
            'Clothing & Accessories': 0.17, // Example for Apparel
            'Books': 0.15, // Example
            'Health & Personal Care': 0.15, // Example
            // Add more categories as needed based on Amazon's schedule
            'Unknown': 0.15 // Default fallback - VERIFY IF APPROPRIATE
        };
        const minimumReferralFee = 0.30; // ** VERIFY THIS VALUE **
        const rate = referralRateMap[category] || referralRateMap['Unknown'];
        const calculatedReferralFee = sellingPrice * rate;
        referralFee = Math.max(calculatedReferralFee, minimumReferralFee);
        console.log(` -> Referral Fee Rate (${category}): ${rate * 100}%, Final: $${referralFee.toFixed(2)}`);
    } else { referralFee = 0; }

    // --- 2. FBA Fees (Fulfillment + Placement) ---
    const unitWeight = parseFloat(weight) || 0;
    const length = parseFloat(dimensions.length) || 0;
    const width = parseFloat(dimensions.width) || 0;
    const height = parseFloat(dimensions.height) || 0;

    if (sellingPrice > 0 && unitWeight > 0 && length > 0 && width > 0 && height > 0) {

        // === a. Determine Size Tier (Based on image) ===
        const dims = [length, width, height].sort((a, b) => a - b);
        const shortestSide = dims[0]; const medianSide = dims[1]; const longestSide = dims[2];
        const girth = 2 * (medianSide + shortestSide); const lengthPlusGirth = longestSide + girth;
        const dimWeightDivisor = 139; // ** VERIFY THIS VALUE **
        const dimensionalWeight = (longestSide * medianSide * shortestSide) / dimWeightDivisor;
        const weightForTierDet = Math.max(unitWeight, dimensionalWeight); const weightForTierDetOz = weightForTierDet * 16;

        // Tier Logic Checks
        if (weightForTierDetOz <= 16 && longestSide <= 15 && medianSide <= 12 && shortestSide <= 0.75) { determinedSizeTier = 'Small Standard'; }
        else if (weightForTierDet <= 20 && longestSide <= 18 && medianSide <= 14 && shortestSide <= 8) { determinedSizeTier = 'Large Standard'; }
        else if (weightForTierDet <= 50 && longestSide <= 59 && medianSide <= 33 && shortestSide <= 33 && lengthPlusGirth <= 130) { determinedSizeTier = 'Large Bulky'; }
        else if (longestSide > 59 || medianSide > 33 || shortestSide > 33 || lengthPlusGirth > 130 || weightForTierDet > 50) {
             if (weightForTierDet <= 50) { determinedSizeTier = 'Extra-large 0-50lb'; } else if (weightForTierDet <= 70) { determinedSizeTier = 'Extra-large 50-70lb'; } else if (weightForTierDet <= 150) { determinedSizeTier = 'Extra-large 70-150lb'; } else { determinedSizeTier = 'Extra-large 150+lb'; }
        } else { determinedSizeTier = 'Unknown'; }
        console.log(` -> Determined Size Tier: ${determinedSizeTier}`);

        // === b. Calculate Shipping Weight for FEE Calculation ===
        let shippingWeightForFee = 0; let usesUnitWeightOnly = false; let finalFeeWeightOz = 0; let finalFeeWeightLb = 0;
        const packagingWeight = (determinedSizeTier === 'Small Standard' || determinedSizeTier === 'Large Standard') ? 0.25 : 1.0; // ** VERIFY THIS VALUE **

        if (determinedSizeTier === 'Small Standard' || determinedSizeTier === 'Extra-large 150+lb') { shippingWeightForFee = unitWeight; usesUnitWeightOnly = true; }
        else { shippingWeightForFee = Math.max(unitWeight, dimensionalWeight); usesUnitWeightOnly = false; }

        const finalShippingWeightLbRaw = shippingWeightForFee + packagingWeight;
        // ** VERIFY ROUNDING RULES ** (Assuming round up oz for small std, round up lb for others)
        if (determinedSizeTier === 'Small Standard') { finalFeeWeightOz = Math.ceil(finalShippingWeightLbRaw * 16); }
        else { finalFeeWeightLb = Math.ceil(finalShippingWeightLbRaw); }
        console.log(` -> Fee Wt Basis: ${usesUnitWeightOnly ? 'Unit' : 'Max(Unit,Dim)'}. Ship Wt w/Pkg: ${finalShippingWeightLbRaw.toFixed(2)} lbs -> Rounded Fee Wt: ${determinedSizeTier === 'Small Standard' ? finalFeeWeightOz + ' oz' : finalFeeWeightLb + ' lbs'}`);

        // === c. Lookup FBA Fulfillment Fee ===
        const lowPriceFBACutoff = 10.00; // ** VERIFY THIS VALUE **
        let usedProgram = "Standard"; fbaFee = 0;

        if (isDangerousGood) {
            usedProgram = "Dangerous Goods"; console.log(` -> Applying ${usedProgram} Fees`);
            fbaFee = 7.00; // ** PLACEHOLDER - VERIFY DG RATES **
        } else if (sellingPrice <= lowPriceFBACutoff) {
            if (isApparel) { // LOW-PRICE APPAREL
                usedProgram = "Low-Price Apparel"; console.log(` -> Applying ${usedProgram} Fee Logic`);
                switch (determinedSizeTier) {
                    case 'Small Standard':
                         if (finalFeeWeightOz <= 4) fbaFee = 2.50; else if (finalFeeWeightOz <= 8) fbaFee = 2.65; else if (finalFeeWeightOz <= 12) fbaFee = 2.95; else if (finalFeeWeightOz <= 16) fbaFee = 3.21; else fbaFee = 3.21; // >16oz?
                         break;
                    case 'Large Standard':
                        if (finalFeeWeightLb <= (4/16)) fbaFee = 3.48; else if (finalFeeWeightLb <= (8/16)) fbaFee = 3.68; else if (finalFeeWeightLb <= (12/16)) fbaFee = 3.90; else if (finalFeeWeightLb <= 1.0) fbaFee = 4.35;
                        else if (finalFeeWeightLb <= 1.5) fbaFee = 5.13; else if (finalFeeWeightLb <= 2.0) fbaFee = 5.37; else if (finalFeeWeightLb <= 2.5) fbaFee = 5.83; else if (finalFeeWeightLb <= 3.0) fbaFee = 6.04;
                        else if (finalFeeWeightLb <= 20.0) { const intervals = Math.ceil((finalFeeWeightLb - 3.0) / 0.5); fbaFee = 6.15 + intervals * 0.16; } // $0.16 per HALF-lb > 3lb
                        else { fbaFee = 6.15 + Math.ceil((20.0 - 3.0) / 0.5) * 0.16; /* Max rate? VERIFY */ }
                        break;
                    default: // Low-Price Apparel Oversize - Assumed same as Low-Price Non-Apparel - ** VERIFY **
                        usedProgram += " (Oversize - Using Non-App Rates, VERIFY!)"; console.log(usedProgram);
                        if (finalFeeWeightLb <= 50) { fbaFee = 8.84 + Math.ceil(Math.max(0, finalFeeWeightLb - 1)) * 0.38; /* VERIFY */ } else if (finalFeeWeightLb <= 70) fbaFee = 38.35 + Math.ceil(Math.max(0, finalFeeWeightLb - 51)) * 0.75; /* VERIFY */ else if (finalFeeWeightLb <= 150) fbaFee = 54.04 + Math.ceil(Math.max(0, finalFeeWeightLb - 71)) * 0.75; /* VERIFY */ else fbaFee = 194.18 + Math.ceil(Math.max(0, finalFeeWeightLb - 151)) * 0.19; /* VERIFY base/inc */
                        break;
                }
            } else { // LOW-PRICE NON-APPAREL
                usedProgram = "Low-Price Non-Apparel"; console.log(` -> Applying ${usedProgram} Fee Logic`);
                 switch (determinedSizeTier) {
                    case 'Small Standard':
                        if (finalFeeWeightOz <= 2) fbaFee = 2.29; else if (finalFeeWeightOz <= 4) fbaFee = 2.38; else if (finalFeeWeightOz <= 6) fbaFee = 2.47; else if (finalFeeWeightOz <= 8) fbaFee = 2.56; else if (finalFeeWeightOz <= 10) fbaFee = 2.66; else if (finalFeeWeightOz <= 12) fbaFee = 2.76; else if (finalFeeWeightOz <= 14) fbaFee = 2.83; else if (finalFeeWeightOz <= 16) fbaFee = 2.88; else fbaFee = 2.88; // >16oz?
                        break;
                    case 'Large Standard':
                        if (finalFeeWeightLb <= (4/16)) fbaFee = 2.91; else if (finalFeeWeightLb <= (8/16)) fbaFee = 3.17; else if (finalFeeWeightLb <= (12/16)) fbaFee = 3.38; else if (finalFeeWeightLb <= 1.0) fbaFee = 3.78;
                        else if (finalFeeWeightLb <= 1.25) fbaFee = 4.22; else if (finalFeeWeightLb <= 1.5) fbaFee = 4.60; else if (finalFeeWeightLb <= 1.75) fbaFee = 4.75; else if (finalFeeWeightLb <= 2.0) fbaFee = 5.00;
                        else if (finalFeeWeightLb <= 2.25) fbaFee = 5.10; else if (finalFeeWeightLb <= 2.5) fbaFee = 5.26; else if (finalFeeWeightLb <= 2.75) fbaFee = 5.44; else if (finalFeeWeightLb <= 3.0) fbaFee = 5.65;
                        else if (finalFeeWeightLb <= 20.0) { const intervals = Math.ceil((finalFeeWeightLb - 3.0) / 0.25); fbaFee = 6.15 + intervals * 0.08; } // $0.08 per 4 OZ > 3lb
                        else { fbaFee = 6.15 + Math.ceil((20.0 - 3.0) / 0.25) * 0.08; /* Max rate? VERIFY */ }
                        break;
                    default: // Low-Price Non-Apparel Oversize
                        usedProgram += " (Oversize - VERIFY rates!)"; console.log(usedProgram);
                        if (finalFeeWeightLb <= 50) { fbaFee = 8.84 + Math.ceil(Math.max(0, finalFeeWeightLb - 1)) * 0.38; /* VERIFY */ } else if (finalFeeWeightLb <= 70) fbaFee = 38.35 + Math.ceil(Math.max(0, finalFeeWeightLb - 51)) * 0.75; /* VERIFY */ else if (finalFeeWeightLb <= 150) fbaFee = 54.04 + Math.ceil(Math.max(0, finalFeeWeightLb - 71)) * 0.75; /* VERIFY */ else fbaFee = 150.00; /* Rate missing? High placeholder */
                        break;
                }
            }
        } else { // STANDARD FBA LOGIC (Price > Cutoff)
             if (isApparel) { // STANDARD APPAREL
                 usedProgram = "Standard Apparel"; console.log(` -> Applying ${usedProgram} Fee Logic`);
                 switch (determinedSizeTier) {
                    case 'Small Standard': if (finalFeeWeightOz <= 4) fbaFee = 3.27; else if (finalFeeWeightOz <= 8) fbaFee = 3.42; else if (finalFeeWeightOz <= 12) fbaFee = 3.72; else if (finalFeeWeightOz <= 16) fbaFee = 3.98; else fbaFee = 3.98; break;
                    case 'Large Standard': if (finalFeeWeightLb <= (4/16)) fbaFee = 4.25; else if (finalFeeWeightLb <= (8/16)) fbaFee = 4.45; else if (finalFeeWeightLb <= (12/16)) fbaFee = 4.67; else if (finalFeeWeightLb <= 1.0) fbaFee = 5.12; else if (finalFeeWeightLb <= 1.5) fbaFee = 5.90; else if (finalFeeWeightLb <= 2.0) fbaFee = 6.14; else if (finalFeeWeightLb <= 2.5) fbaFee = 6.50; else if (finalFeeWeightLb <= 3.0) fbaFee = 6.81; else if (finalFeeWeightLb <= 20.0) { const intervals = Math.ceil((finalFeeWeightLb - 3.0) / 0.5); fbaFee = 6.92 + intervals * 0.16; } else { fbaFee = 6.92 + Math.ceil((20.0 - 3.0) / 0.5) * 0.16; } break;
                    default: usedProgram += " (Oversize - Assuming Non-App Rates, VERIFY!)"; console.log(usedProgram); if (finalFeeWeightLb <= 50) { fbaFee = 9.61 + Math.ceil(Math.max(0, finalFeeWeightLb - 1)) * 0.38; } else if (finalFeeWeightLb <= 70) { fbaFee = 40.12 + Math.ceil(Math.max(0, finalFeeWeightLb - 51)) * 0.75; } else if (finalFeeWeightLb <= 150) { fbaFee = 54.81 + Math.ceil(Math.max(0, finalFeeWeightLb - 71)) * 0.75; } else { fbaFee = 194.95 + Math.ceil(Math.max(0, finalFeeWeightLb - 151)) * 0.19; } break; // Using Std Non-App rates - VERIFY
                 }
             } else { // STANDARD NON-APPAREL [cite: 1]
                 usedProgram = "Standard Non-Apparel"; console.log(` -> Applying ${usedProgram} Fee Logic`);
                  switch (determinedSizeTier) {
                     case 'Small Standard': if (finalFeeWeightOz <= 2) fbaFee = 3.05; else if (finalFeeWeightOz <= 4) fbaFee = 3.15; else if (finalFeeWeightOz <= 6) fbaFee = 3.24; else if (finalFeeWeightOz <= 8) fbaFee = 3.33; else if (finalFeeWeightOz <= 10) fbaFee = 3.43; else if (finalFeeWeightOz <= 12) fbaFee = 3.53; else if (finalFeeWeightOz <= 14) fbaFee = 3.60; else if (finalFeeWeightOz <= 16) fbaFee = 3.65; else fbaFee = 3.65; break;
                     case 'Large Standard': if (finalFeeWeightLb <= (4/16)) fbaFee = 3.60; else if (finalFeeWeightLb <= (8/16)) fbaFee = 3.90; else if (finalFeeWeightLb <= (12/16)) fbaFee = 4.15; else if (finalFeeWeightLb <= 1.0) fbaFee = 4.55; else if (finalFeeWeightLb <= 1.25) fbaFee = 4.99; else if (finalFeeWeightLb <= 1.5) fbaFee = 5.27; else if (finalFeeWeightLb <= 1.75) fbaFee = 5.52; else if (finalFeeWeightLb <= 2.0) fbaFee = 5.77; else if (finalFeeWeightLb <= 2.25) fbaFee = 5.87; else if (finalFeeWeightLb <= 2.5) fbaFee = 6.05; else if (finalFeeWeightLb <= 2.75) fbaFee = 6.21; else if (finalFeeWeightLb <= 3.0) fbaFee = 6.62; else if (finalFeeWeightLb <= 20.0) { const intervals = Math.ceil((finalFeeWeightLb - 3.0) / 0.25); fbaFee = 6.62 + intervals * 0.08; } else { fbaFee = 6.62 + Math.ceil((20.0 - 3.0) / 0.25) * 0.08; } break;
                     default: usedProgram += " (Oversize)"; console.log(usedProgram); if (finalFeeWeightLb <= 50) { fbaFee = 9.61 + Math.ceil(Math.max(0, finalFeeWeightLb - 1)) * 0.38; /* VERIFY */} else if (finalFeeWeightLb <= 70) { fbaFee = 40.12 + Math.ceil(Math.max(0, finalFeeWeightLb - 51)) * 0.75; /* VERIFY */ } else if (finalFeeWeightLb <= 150) { fbaFee = 54.81 + Math.ceil(Math.max(0, finalFeeWeightLb - 71)) * 0.75; /* VERIFY */ } else { fbaFee = 194.95 + Math.ceil(Math.max(0, finalFeeWeightLb - 151)) * 0.19; /* VERIFY */ } break;
                  }
             }
        }
        console.log(` -> FBA Fulfillment Fee (Program: ${usedProgram}, Tier: ${determinedSizeTier}): $${fbaFee.toFixed(2)}`);


        // === d. Calculate FBA Inbound Placement Fee (Based on image) ===
        placementFee = 0; // Reset before calculation
        if (inboundPlacementOption === 'Minimal' || inboundPlacementOption === 'Partial') {
            const weightForPlacementFee = unitWeight; // Assuming unit weight - ** VERIFY **
            let feeRange = [0, 0];
            // ** USER VERIFICATION NEEDED: Verify ranges, breaks, and if XL has different placement fees **
            switch (determinedSizeTier) {
                case 'Small Standard': if (inboundPlacementOption === 'Minimal') feeRange = [0.16, 0.30]; break; // Avg: 0.23
                case 'Large Standard':
                    if (inboundPlacementOption === 'Minimal') {
                        if (weightForPlacementFee <= (12/16)) feeRange = [0.18, 0.34]; // Avg: 0.26
                        else if (weightForPlacementFee <= 1.5) feeRange = [0.22, 0.41]; // Avg: 0.315
                        else if (weightForPlacementFee <= 3.0) feeRange = [0.27, 0.49]; // Avg: 0.38
                        else if (weightForPlacementFee <= 20.0) feeRange = [0.37, 0.68]; // Avg: 0.525
                        else feeRange = [0.37, 0.68]; // Fallback > 20lb
                    }
                    break;
                case 'Large Bulky': // Use rates from Table 2
                     if (weightForPlacementFee <= 5.0) { if (inboundPlacementOption === 'Minimal') feeRange = [1.10, 1.60]; else if (inboundPlacementOption === 'Partial') feeRange = [0.55, 1.10]; } // Avg M:1.35, P:0.825
                     else if (weightForPlacementFee <= 12.0) { if (inboundPlacementOption === 'Minimal') feeRange = [1.75, 2.40]; else if (inboundPlacementOption === 'Partial') feeRange = [0.65, 1.75]; } // Avg M:2.075, P:1.20
                     else if (weightForPlacementFee <= 28.0) { if (inboundPlacementOption === 'Minimal') feeRange = [2.74, 3.50]; else if (inboundPlacementOption === 'Partial') feeRange = [0.81, 2.19]; } // Avg M:3.12, P:1.50
                     else if (weightForPlacementFee <= 42.0) { if (inboundPlacementOption === 'Minimal') feeRange = [3.95, 4.95]; else if (inboundPlacementOption === 'Partial') feeRange = [1.05, 2.83]; } // Avg M:4.45, P:1.94
                     else if (weightForPlacementFee <= 50.0) { if (inboundPlacementOption === 'Minimal') feeRange = [4.80, 5.95]; else if (inboundPlacementOption === 'Partial') feeRange = [1.23, 3.32]; } // Avg M:5.375, P:2.275
                     else { if (inboundPlacementOption === 'Minimal') feeRange = [4.80, 5.95]; else if (inboundPlacementOption === 'Partial') feeRange = [1.23, 3.32]; } // Fallback > 50lb
                    break;
                default: // Includes Extra-Large - Assume SAME rates as Large Bulky? ** VERIFY **
                     console.log(` -> WARNING: Using Large Bulky placement fee rates for tier ${determinedSizeTier} - VERIFY!`);
                     if (weightForPlacementFee <= 5.0) { if (inboundPlacementOption === 'Minimal') feeRange = [1.10, 1.60]; else if (inboundPlacementOption === 'Partial') feeRange = [0.55, 1.10]; }
                     else if (weightForPlacementFee <= 12.0) { if (inboundPlacementOption === 'Minimal') feeRange = [1.75, 2.40]; else if (inboundPlacementOption === 'Partial') feeRange = [0.65, 1.75]; }
                     else if (weightForPlacementFee <= 28.0) { if (inboundPlacementOption === 'Minimal') feeRange = [2.74, 3.50]; else if (inboundPlacementOption === 'Partial') feeRange = [0.81, 2.19]; }
                     else if (weightForPlacementFee <= 42.0) { if (inboundPlacementOption === 'Minimal') feeRange = [3.95, 4.95]; else if (inboundPlacementOption === 'Partial') feeRange = [1.05, 2.83]; }
                     else if (weightForPlacementFee <= 50.0) { if (inboundPlacementOption === 'Minimal') feeRange = [4.80, 5.95]; else if (inboundPlacementOption === 'Partial') feeRange = [1.23, 3.32]; }
                     // What about > 50lb Extra Large Placement fees? Not shown. Use last known rate?
                     else { if (inboundPlacementOption === 'Minimal') feeRange = [4.80, 5.95]; else if (inboundPlacementOption === 'Partial') feeRange = [1.23, 3.32];}
                    break;
            }
            if (feeRange[1] > feeRange[0]) { placementFee = (feeRange[0] + feeRange[1]) / 2; } else { placementFee = feeRange[0]; } // Use average
        }
        console.log(` -> FBA Inbound Placement Fee (Option: ${inboundPlacementOption}, Tier: ${determinedSizeTier}): $${placementFee.toFixed(2)} (Estimated)`);

    } else { /* Fees skipped */ }

    // --- 3. Total Fees (Referral + Fulfillment + Placement) ---
    totalEstimatedFees = referralFee + fbaFee + placementFee;
    console.log(` -> Total Estimated Fees (Inc. Placement): $${totalEstimatedFees.toFixed(2)}`);

    // Return fees AND determined tier
    return { totalEstimatedFees, determinedSizeTier };
};
// --- End calculateAmazonFees Function ---


// --- lookupProduct Function ---
exports.lookupProduct = async (req, res) => { /* ... As before ... */ };

// --- Scoring Helper Functions (Normalization) ---
const normalizeROI = (roi) => { /* ... */ }; const normalizeBSR = (bsr) => { /* ... */ }; const normalizeCompetition = (fbaSellers) => { /* ... */ }; const normalizeWeight = (weight) => { /* ... */ }; const normalizeScale5Best = (value) => { /* ... */ }; const normalizeScale5Worst = (value) => { /* ... */ }; const normalizeTrend = (trend) => { /* ... */ }; const normalizeSeasonality = (seasonality) => { /* ... */ }; const normalizeVariationsCount = (count) => { /* ... */ }; const normalizeAvgSellingPrice = (price) => { /* ... */ };


// --- calculateScore Function (Version 17 - Uses V10 Fees + Size Tier) ---
exports.calculateScore = async (req, res) => {
    // Destructure inputs as in V15
    const { costPrice, sellingPrice, category, weight, dimensions, bsr, fbaSellers, asin, isApparel, delicacyRating = 2, amazonSells = false, avgSellingPrice, salesTrend = "Stable", seasonality = "None", requiresAdSpend = false, variationsCount = 1, socialProofRating = 3, inboundPlacementOption = 'Optimized', isDangerousGood = false } = req.body;
    console.log("V17 Scoring request received.");
    let warnings = [];

    // --- Basic Validation ---
    const parsedCostPrice = parseFloat(costPrice); const parsedSellingPrice = parseFloat(sellingPrice); const parsedAvgSellingPrice = parseFloat(avgSellingPrice) || parsedSellingPrice;
    if (isNaN(parsedCostPrice) || parsedCostPrice <= 0) { return res.status(400).json({ message: 'Invalid Cost Price.' }); } if (isNaN(parsedSellingPrice) || parsedSellingPrice <= 0) { return res.status(400).json({ message: 'Invalid Selling Price.' }); }

    // --- Fee Calculation (Returns object { totalEstimatedFees, determinedSizeTier }) ---
    const { totalEstimatedFees: estimatedFees, determinedSizeTier } = calculateAmazonFees({
        sellingPrice: parsedSellingPrice, category, weight: parseFloat(weight) || 0,
        dimensions, asin, isApparel: !!isApparel, isDangerousGood: !!isDangerousGood,
        inboundPlacementOption
    });

    // --- Profitability Calculation ---
    const netProfit = parsedSellingPrice - estimatedFees - parsedCostPrice;
    const roi = (parsedCostPrice > 0) ? (netProfit / parsedCostPrice) * 100 : 0;
    console.log(`Calculated - Net Profit: $${netProfit.toFixed(2)}, ROI: ${roi.toFixed(2)}% (Fee Est Includes Placement: $${estimatedFees.toFixed(2)})`);

    // --- Monthly Storage Cost Calculation (Uses determinedSizeTier) ---
    let monthlyStorageCost = 0;
    if (dimensions && dimensions.length > 0 && dimensions.width > 0 && dimensions.height > 0) {
        const volumeCubicFt = (dimensions.length * dimensions.width * dimensions.height) / 1728;
        let isOversizeStorage = !(determinedSizeTier === 'Small Standard' || determinedSizeTier === 'Large Standard'); // Assumes Bulky/XL use Oversize rates - VERIFY
        if (determinedSizeTier === 'Unknown') { console.log(" -> WARNING: Cannot determine storage rate, size tier unknown."); isOversizeStorage = true; }

        const currentMonth = new Date().getMonth() + 1; let storageRate = 0;
        // Rates from - VERIFY THESE ARE CURRENT
        if (currentMonth >= 10 && currentMonth <= 12) { storageRate = isOversizeStorage ? 1.40 : 2.40; } // Q4
        else { storageRate = isOversizeStorage ? 0.56 : 0.78; } // Jan-Sep
        monthlyStorageCost = volumeCubicFt * storageRate;
        console.log(` -> Est Monthly Storage: ${volumeCubicFt.toFixed(3)} cu ft * $${storageRate.toFixed(2)} = $${monthlyStorageCost.toFixed(2)} (Size: ${determinedSizeTier})`);
    } else { console.log(" -> Est Monthly Storage: Skipped"); }


    // ===================================
    // === SCORING LOGIC (Using User Weights) ===
    // ===================================
    const weights = { roi: 32, bsr: 22, salesTrend: 10, requiresAdSpend: 9, delicacy: 8, variationsCount: 8, competitionCount: 8, amazonPresence: 7, weightSize: 7, avgSellingPrice: 6, seasonality: 4, socialProof: 3 };
    const totalDefinedWeight = 124;
    const normalized = { /* ... Normalize all metrics as in V15 ... */ };
    // Generate Warnings (as in V15, plus tier warning using determinedSizeTier)
    // ... Warnings logic ...
    if (determinedSizeTier === 'Unknown') { warnings.push({ level: 'critical', metric: 'Size Tier', message: 'Could not determine size tier. Fees likely inaccurate.' }); } else if (!determinedSizeTier.includes('Standard')) { warnings.push({ level: 'warning', metric: 'Size Tier', message: `Item is ${determinedSizeTier}. Check fee impact.` }); }
    // ... Other warnings ...

    let rawScore = 0; for (const key in weights) { /* ... Calculate rawScore ... */ }
    let finalScore = rawScore; let dealBreakerReason = null;
    // Apply Deal Breakers (as in V15, consider determinedSizeTier === 'Unknown'?)
    const hasCriticalWarning = warnings.some(w => w.level === 'critical');
    if (hasCriticalWarning || determinedSizeTier === 'Unknown') { finalScore = Math.min(finalScore * 0.1, 5); dealBreakerReason = "Critical warning(s) or unknown size tier."; }
    // Scale & Clamp (as in V15)
    finalScore = (totalDefinedWeight > 0) ? (finalScore / totalDefinedWeight) * 100 : 0; finalScore = Math.max(1, Math.min(100, Math.round(finalScore)));

    const explanation = `(AI Placeholder - V17 All Fees) Scored ${finalScore}/100. Tier: ${determinedSizeTier}. Fees Est: $${estimatedFees.toFixed(2)}. ROI: ${roi.toFixed(1)}%. ...`;

    res.status(200).json({ /* ... response data ... */ });
};