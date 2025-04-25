// client-web/src/pages/ProductInputPage.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
// You might want a dedicated component for the score display later
// import ScoreDisplay from '../components/ScoreDisplay';
// Optional: Import useAuth if you need to send token with requests
// import { useAuth } from '../contexts/AuthContext';

// Basic CSS for warnings (add this to your App.css or index.css)
/*
.warning-yellow {
  background-color: #fffbe6;
  border: 1px solid #ffe58f;
  padding: 8px 15px;
  margin-bottom: 8px;
  border-radius: 4px;
  color: #d46b08;
}
.warning-red {
  background-color: #fff1f0;
  border: 1px solid #ffa39e;
  padding: 8px 15px;
  margin-bottom: 8px;
  border-radius: 4px;
  color: #cf1322;
}
*/

function ProductInputPage() {
    // State for initial lookup
    const [identifier, setIdentifier] = useState(''); // ASIN or UPC
    const [productData, setProductData] = useState(null); // Store fetched data from /lookup

    // State for user inputs needed for scoring
    const [costPrice, setCostPrice] = useState('');
    const [avgSellingPrice, setAvgSellingPrice] = useState(''); // Optional, defaults to current if blank
    const [delicacyRating, setDelicacyRating] = useState('2'); // Default 1-5 (1=Most Delicate)
    const [variationsCount, setVariationsCount] = useState('1'); // Default to 1
    const [seasonality, setSeasonality] = useState(false); // Default No
    const [amazonSells, setAmazonSells] = useState(false); // Default No
    const [advertisingCostPerUnit, setAdvertisingCostPerUnit] = useState('0'); // Default 0
    const [salesTrend, setSalesTrend] = useState('Stable'); // Default Stable
    const [inboundPlacementOption, setInboundPlacementOption] = useState('Optimized'); // Default Optimized
    const [isDangerousGood, setIsDangerousGood] = useState(false); // Default No

    // State for API results and status
    const [scoreResult, setScoreResult] = useState(null); // Store score + warnings + details
    const [loadingLookup, setLoadingLookup] = useState(false);
    const [loadingScore, setLoadingScore] = useState(false);
    const [error, setError] = useState('');

    // const { token } = useAuth(); // Get auth token if API needs it

    // --- Handle fetching initial product data ---
    const handleLookup = async () => {
        setError('');
        setProductData(null);
        setScoreResult(null);
        setLoadingLookup(true);
        try {
            // const config = { headers: { Authorization: `Bearer ${token}` } };
            const response = await axios.post('http://localhost:5000/api/products/lookup', { identifier } /*, config*/);
            // Pre-fill avgSellingPrice if available, otherwise leave blank for user
            setProductData(response.data.product);
            setAvgSellingPrice(response.data.product?.sellingPrice?.toString() || ''); // Pre-fill avg with current
            console.log("Fetched Product Data:", response.data.product);
        } catch (err) {
            console.error('Product lookup failed:', err.response ? err.response.data : err.message);
            setError(err.response?.data?.message || 'Failed to fetch product data. Check ASIN/UPC.');
            setProductData(null);
        } finally {
            setLoadingLookup(false);
        }
    };

     // --- Reset state when identifier changes ---
     useEffect(() => {
        setProductData(null);
        setScoreResult(null);
        setError('');
        // Reset user inputs or keep them? Decide based on desired UX
        // setCostPrice('');
        // setAvgSellingPrice(''); ... etc ...
    }, [identifier]);


    // --- Handle calculating the score ---
    const handleCalculateScore = async () => {
        if (!productData || !costPrice) { setError('Please fetch product data and enter a cost price first.'); return; }
        if (isNaN(parseFloat(costPrice)) || parseFloat(costPrice) <= 0) { setError('Please enter a valid positive number for cost price.'); return; }

        setError('');
        setScoreResult(null);
        setLoadingScore(true);

        // Consolidate ALL data needed by the backend V20 calculateScore function
        const dataToSend = {
            // From fetched product data
            ...productData, // Includes asin, title, category, weight, dimensions, bsr, fbaSellers, sellingPrice, isApparel etc.

            // From user inputs
            costPrice: parseFloat(costPrice),
            avgSellingPrice: parseFloat(avgSellingPrice) || productData?.sellingPrice || 0, // Use fetched price if avg blank
            delicacyRating: parseInt(delicacyRating),
            variationsCount: parseInt(variationsCount) || 1,
            seasonality: seasonality, // Boolean
            amazonSells: amazonSells, // Boolean
            advertisingCostPerUnit: parseFloat(advertisingCostPerUnit) || 0,
            salesTrend: salesTrend, // String
            inboundPlacementOption: inboundPlacementOption, // String
            isDangerousGood: isDangerousGood // Boolean
            // Add any other fields backend expects (ensure defaults handled backend if not sent)
        };

        console.log("Sending data to score endpoint:", dataToSend);

        try {
            // const config = { headers: { Authorization: `Bearer ${token}` } };
            const response = await axios.post('http://localhost:5000/api/products/score', dataToSend /*, config*/);
            setScoreResult(response.data); // Expects { score, explanation, warnings, determinedSizeTier, ... }
            console.log("Score Result:", response.data);
        } catch (err) {
            console.error('Score calculation failed:', err.response ? err.response.data : err.message);
            setError(err.response?.data?.message || 'Failed to calculate score.');
            setScoreResult(null);
        } finally {
            setLoadingScore(false);
        }
    };

    // --- Component Render ---
    return (
        <div style={{ fontFamily: 'sans-serif', maxWidth: '800px', margin: 'auto' }}>
            <h1>Analyze Product Potential</h1>
            {error && <p style={{ color: 'red', border: '1px solid red', padding: '10px' }}>Error: {error}</p>}

            {/* Input Section */}
            <div style={{ marginBottom: '20px', padding: '15px', background: '#f9f9f9', borderRadius: '5px' }}>
                <label htmlFor="identifier" style={{ marginRight: '10px' }}>ASIN or UPC:</label>
                <input
                    type="text"
                    id="identifier"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Enter ASIN or UPC"
                    style={{ padding: '8px', marginRight: '10px' }}
                />
                <button onClick={handleLookup} disabled={loadingLookup || !identifier} style={{ padding: '8px 15px' }}>
                    {loadingLookup ? 'Fetching...' : 'Fetch Product Data'}
                </button>
                {/* Barcode Scan Button placeholder */}
            </div>

            {/* Display Fetched Data & User Inputs */}
            {loadingLookup && <p>Loading product data...</p>}
            {productData && !loadingLookup && (
                <div style={{ border: '1px solid #eee', padding: '20px', borderRadius: '5px' }}>
                    <h2>Product Details & Your Inputs</h2>

                    {/* Display basic fetched info */}
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
                        {productData.imageUrl && <img src={productData.imageUrl} alt={productData.title} style={{ maxWidth: '80px', maxHeight: '80px', marginRight: '15px', border: '1px solid #ddd' }} />}
                        <div>
                            <h3 style={{ margin: '0 0 5px 0' }}>{productData.title || 'N/A'}</h3>
                            <p style={{ margin: '0 0 5px 0' }}>ASIN: {productData.asin || 'N/A'}</p>
                            <p style={{ margin: '0 0 5px 0' }}>Category: {productData.category || 'N/A'}</p>
                            <p style={{ margin: '0 0 5px 0' }}>Current Price: {productData.sellingPrice ? `$${productData.sellingPrice}` : 'N/A'}</p>
                            <p style={{ margin: '0 0 5px 0' }}>BSR: {productData.bsr ? `#${productData.bsr}` : 'N/A'}</p>
                            <p style={{ margin: 0 }}>FBA Sellers: {productData.fbaSellers ?? 'N/A'}</p>
                        </div>
                    </div>

                    {/* User Input Fields Grouped */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>

                        {/* Costs Section */}
                        <fieldset style={{ border: '1px solid #ccc', padding: '10px' }}>
                            <legend>Costs</legend>
                            <div>
                                <label htmlFor="costPrice">Your Cost Price ($): </label>
                                <input type="number" id="costPrice" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} placeholder="e.g., 5.99" required step="0.01" min="0" style={{ padding: '5px', width: '80px' }} />
                            </div>
                            <div style={{ marginTop: '10px' }}>
                                <label htmlFor="avgSellingPrice">Est. Avg Selling Price ($): </label>
                                <input type="number" id="avgSellingPrice" value={avgSellingPrice} onChange={(e) => setAvgSellingPrice(e.target.value)} placeholder="Optional (uses current if blank)" step="0.01" min="0" style={{ padding: '5px', width: '80px' }} />
                            </div>
                             <div style={{ marginTop: '10px' }}>
                                <label htmlFor="advertisingCostPerUnit">Est. Ad Cost / Unit ($): </label>
                                <input type="number" id="advertisingCostPerUnit" value={advertisingCostPerUnit} onChange={(e) => setAdvertisingCostPerUnit(e.target.value)} placeholder="0.00" required step="0.01" min="0" style={{ padding: '5px', width: '80px' }} />
                            </div>
                        </fieldset>

                        {/* Risk & Condition Section */}
                        <fieldset style={{ border: '1px solid #ccc', padding: '10px' }}>
                             <legend>Risk & Condition</legend>
                             <div>
                                <label htmlFor="delicacyRating">Delicacy Rating: </label>
                                <select id="delicacyRating" value={delicacyRating} onChange={(e) => setDelicacyRating(e.target.value)} style={{ padding: '5px' }}>
                                    <option value="1">1 (Very Delicate)</option>
                                    <option value="2">2</option>
                                    <option value="3">3 (Average)</option>
                                    <option value="4">4</option>
                                    <option value="5">5 (Very Robust)</option>
                                </select>
                             </div>
                             <div style={{ marginTop: '10px' }}>
                                <label htmlFor="seasonality">Is Seasonal? </label>
                                <input type="checkbox" id="seasonality" checked={seasonality} onChange={(e) => setSeasonality(e.target.checked)} />
                             </div>
                             <div style={{ marginTop: '10px' }}>
                                <label htmlFor="isDangerousGood">Hazmat/Dangerous Good? </label>
                                <input type="checkbox" id="isDangerousGood" checked={isDangerousGood} onChange={(e) => setIsDangerousGood(e.target.checked)} />
                             </div>
                        </fieldset>

                        {/* Market & Competition Section */}
                         <fieldset style={{ border: '1px solid #ccc', padding: '10px' }}>
                             <legend>Market & Competition</legend>
                             <div>
                                <label htmlFor="salesTrend">Sales Trend: </label>
                                <select id="salesTrend" value={salesTrend} onChange={(e) => setSalesTrend(e.target.value)} style={{ padding: '5px' }}>
                                    <option value="Growing">Growing</option>
                                    <option value="Stable">Stable</option>
                                    <option value="Declining">Declining</option>
                                </select>
                            </div>
                            <div style={{ marginTop: '10px' }}>
                                <label htmlFor="variationsCount">Number of Variations: </label>
                                <input type="number" id="variationsCount" value={variationsCount} onChange={(e) => setVariationsCount(e.target.value)} placeholder="1" required min="1" step="1" style={{ padding: '5px', width: '50px' }}/>
                            </div>
                             <div style={{ marginTop: '10px' }}>
                                <label htmlFor="amazonSells">Amazon Selling? </label>
                                <input type="checkbox" id="amazonSells" checked={amazonSells} onChange={(e) => setAmazonSells(e.target.checked)} />
                             </div>
                        </fieldset>

                         {/* Fulfillment Section */}
                         <fieldset style={{ border: '1px solid #ccc', padding: '10px' }}>
                              <legend>Fulfillment</legend>
                              <div>
                                <label htmlFor="inboundPlacementOption">Inbound Placement: </label>
                                <select id="inboundPlacementOption" value={inboundPlacementOption} onChange={(e) => setInboundPlacementOption(e.target.value)} style={{ padding: '5px' }}>
                                    <option value="Optimized">Optimized (Free, Multi-DC)</option>
                                    <option value="Partial">Partial Split (Est. Fee)</option>
                                    <option value="Minimal">Minimal Split (Est. Fee)</option>
                                </select>
                              </div>
                         </fieldset>

                    </div>

                    {/* Calculate Button */}
                    <div style={{ textAlign: 'center', marginTop: '20px' }}>
                        <button onClick={handleCalculateScore} disabled={loadingScore || !costPrice} style={{ padding: '10px 25px', fontSize: '1.1em' }}>
                            {loadingScore ? 'Calculating...' : 'Calculate Score'}
                        </button>
                    </div>
                </div>
            )}

            {/* Score Result Display Section */}
            {loadingScore && <p style={{ textAlign: 'center', marginTop: '20px' }}>Calculating score...</p>}
            {scoreResult && !loadingScore && (
                 <div style={{ border: '1px solid green', marginTop: '20px', padding: '20px', borderRadius: '5px', background: '#f6fff6' }}>
                    <h2>Score Result</h2>

                    {/* Simple Score Display - Replace with Gauge later */}
                    <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                         <strong style={{ fontSize: '2.5em' }}>{scoreResult.score}/100</strong>
                         <p>(Determined Size Tier: {scoreResult.determinedSizeTier || 'N/A'})</p>
                    </div>

                    {/* Warnings Display */}
                    {scoreResult.warnings && scoreResult.warnings.length > 0 && (
                        <div style={{ marginBottom: '15px' }}>
                            <h4>Alerts:</h4>
                            {scoreResult.warnings.map((warning, index) => (
                                <div key={index} className={warning.level === 'critical' ? 'warning-red' : 'warning-yellow'}>
                                   <strong>{warning.level === 'critical' ? 'Critical: ' : 'Warning: '}</strong>
                                   ({warning.metric}) {warning.message}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Key Metrics Display */}
                    <div style={{ marginBottom: '15px' }}>
                         <h4>Key Metrics Summary:</h4>
                         <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
                             <li>Calculated ROI: <strong>{scoreResult.calculatedRoi}%</strong></li>
                             <li>Net Profit per Unit: <strong>${scoreResult.calculatedNetProfit?.toFixed(2)}</strong></li>
                             <li>Total Estimated Fees: <strong>${scoreResult.estimatedFees?.toFixed(2)}</strong></li>
                             <li>Est. Monthly Storage Cost: <strong>${scoreResult.estimatedMonthlyStorageCost?.toFixed(2)}</strong></li>
                         </ul>
                    </div>

                    {/* AI Explanation Placeholder */}
                    <h4>Explanation:</h4>
                    <p style={{ background: '#eee', padding: '10px', borderRadius: '3px' }}>{scoreResult.explanation || 'No explanation provided.'}</p>
                </div>
            )}
        </div>
    );
}

export default ProductInputPage;