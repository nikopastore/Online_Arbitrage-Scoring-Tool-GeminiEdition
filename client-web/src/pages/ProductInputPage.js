// client-web/src/pages/ProductInputPage.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';

// --- Helper UI Components ---

// Simple SVG Gauge Component
const ScoreGauge = ({ score = 0 }) => {
  const scoreValue = Math.max(0, Math.min(100, score));
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const startAngleOffset = -210; // Degrees from 3 o'clock
  const totalArc = 240; // Degrees
  const scoreAngle = (scoreValue / 100) * totalArc;
  // Corrected strokeDashoffset logic for an arc that fills up
  const strokeDashoffset = circumference * (1 - (scoreAngle / 360) * (360 / totalArc) * (totalArc / 360) );
  // Simplified: strokeDashoffset = circumference * (1 - (scoreAngle / totalArc)); // This is not quite right for SVG arc starting point
  // Let's use a simpler approach for fill: calculate the end point of the arc
  // For a 240 degree arc starting at -210 (which is 150 deg from positive x-axis, or -30 deg from negative y-axis)
  // and ending at 30 deg (or -210 + 240)

  const emptyArcOffset = circumference * (1 - (totalArc / 360));
  const fillArcOffset = circumference * (1 - (scoreAngle / 360));


  let color = 'text-red-500'; // Tailwind text color for the number
  let strokeColor = '#dc3545'; // SVG stroke color
  if (scoreValue >= 75) {
    color = 'text-green-500'; strokeColor = '#28a745';
  } else if (scoreValue >= 40) {
    color = 'text-yellow-500'; strokeColor = '#ffc107';
  }

  return (
    <div className="relative w-36 h-36 mx-auto"> {/* Adjusted size */}
      <svg className="w-full h-full" viewBox="0 0 120 120">
        {/* Background Circle for the track */}
        <circle
          cx="60" cy="60" r={radius}
          fill="none"
          stroke="#e9ecef"
          strokeWidth="10" // Adjusted stroke width
          strokeDasharray={circumference}
          strokeDashoffset={emptyArcOffset} // This creates the 240 degree track
          transform={`rotate(${startAngleOffset} 60 60)`}
          strokeLinecap="round"
        />
        {/* Foreground Score Arc */}
        <circle
          cx="60" cy="60" r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth="10" // Adjusted stroke width
          strokeDasharray={circumference}
          strokeDashoffset={fillArcOffset} // Fill part of the 240 degree track
          transform={`rotate(${startAngleOffset} 60 60)`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
        />
        <text
          x="60" y="60"
          textAnchor="middle"
          dy=".3em"
          className={`text-2xl font-bold ${color}`}
        >
          {scoreValue}
        </text>
         <text
          x="60" y="76" // Position below score
          textAnchor="middle"
          className="text-xs text-gray-500"
        >
          / 100
        </text>
      </svg>
    </div>
  );
};

// Warning Item Component
const WarningItem = ({ level, metric, message }) => {
  let bgColor, borderColor, textColor, icon;
  switch (level) {
    case 'critical':
      bgColor = 'bg-red-50'; borderColor = 'border-red-400'; textColor = 'text-red-700';
      icon = <svg className="w-5 h-5 mr-2 fill-current" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12zm-1-3a1 1 0 012 0v2a1 1 0 01-2 0v-2zm0-6a1 1 0 012 0v3a1 1 0 11-2 0V7z"/></svg>;
      break;
    case 'info':
      bgColor = 'bg-blue-50'; borderColor = 'border-blue-400'; textColor = 'text-blue-700';
      icon = <svg className="w-5 h-5 mr-2 fill-current" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12zm-1-7a1 1 0 011-1h.01a1 1 0 010 2H10a1 1 0 01-1-1zm1-3a1 1 0 011 1v2a1 1 0 11-2 0V8a1 1 0 011-1z"/></svg>;
      break;
    case 'warning':
    default:
      bgColor = 'bg-yellow-50'; borderColor = 'border-yellow-400'; textColor = 'text-yellow-700';
      icon = <svg className="w-5 h-5 mr-2 fill-current" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12zm-1.707-6.293a1 1 0 011.414-1.414L10 10.586l.293-.293a1 1 0 011.414 1.414L11.414 12l.293.293a1 1 0 01-1.414 1.414L10 13.414l-.293.293a1 1 0 01-1.414-1.414L8.586 12l-.293-.293z"/></svg>;
      break;
  }
  return (
    <div className={`flex items-start p-3 border-l-4 rounded-r-md mb-2 text-sm ${bgColor} ${borderColor} ${textColor}`}>
      {icon}
      <div>
        <strong className="font-semibold">{level.charAt(0).toUpperCase() + level.slice(1)} ({metric}): </strong>
        {message}
      </div>
    </div>
  );
};

// Reusable Input Field Component
const InputField = ({ id, label, type = "number", value, onChange, placeholder, required = false, step, min, max, className = "" }) => (
    <div className={`mb-4 ${className}`}>
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
            {label}{required && <span className="text-red-500">*</span>}
        </label>
        <input
            type={type}
            id={id}
            name={id}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            required={required}
            step={step}
            min={min}
            max={max}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
    </div>
);

// Reusable Select Field Component
const SelectField = ({ id, label, value, onChange, children, className = "" }) => (
    <div className={`mb-4 ${className}`}>
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <select
            id={id}
            name={id}
            value={value}
            onChange={onChange}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white"
        >
            {children}
        </select>
    </div>
);

// Reusable Checkbox Field Component
const CheckboxField = ({ id, label, checked, onChange, className = "" }) => (
    <div className={`flex items-center mb-3 ${className}`}>
        <input
            type="checkbox"
            id={id}
            name={id}
            checked={checked}
            onChange={onChange}
            className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
        />
        <label htmlFor={id} className="ml-2 block text-sm text-gray-900">{label}</label>
    </div>
);


// Main Page Component
function ProductInputPage() {
    // State for initial lookup
    const [identifier, setIdentifier] = useState('');
    const [productData, setProductData] = useState(null);

    // State for user inputs
    const [costPrice, setCostPrice] = useState('');
    const [advertisingCostPerUnit, setAdvertisingCostPerUnit] = useState('0');
    const [delicacyRating, setDelicacyRating] = useState('3');
    const [variationsCount, setVariationsCount] = useState('1');
    const [seasonality, setSeasonality] = useState(false);
    const [amazonSells, setAmazonSells] = useState(false);
    const [salesTrend, setSalesTrend] = useState('Stable');
    const [inboundPlacementOption, setInboundPlacementOption] = useState('Optimized');
    const [isDangerousGood, setIsDangerousGood] = useState(false);
    const [estimatedSalesPerMonth, setEstimatedSalesPerMonth] = useState('');
    const [estimatedTimeToSale, setEstimatedTimeToSale] = useState('');
    const [supplierDiscountRebate, setSupplierDiscountRebate] = useState('0');

    // State for API results and status
    const [scoreResult, setScoreResult] = useState(null);
    const [loadingLookup, setLoadingLookup] = useState(false);
    const [loadingScore, setLoadingScore] = useState(false);
    const [error, setError] = useState('');

    const resetOptionalFields = (fetchedProductData = null) => {
        setAdvertisingCostPerUnit('0');
        setDelicacyRating('3');
        setVariationsCount(fetchedProductData?.variationsCount?.toString() || '1');
        setSeasonality(false);
        setAmazonSells(false);
        setSalesTrend('Stable');
        setInboundPlacementOption('Optimized');
        setIsDangerousGood(false);
        setEstimatedSalesPerMonth('');
        setEstimatedTimeToSale('');
        setSupplierDiscountRebate('0');
    };

    const handleLookup = async () => {
        setError(''); setProductData(null); setScoreResult(null); setLoadingLookup(true);
        try {
            const response = await axios.post('http://localhost:5000/api/products/lookup', { identifier });
            setProductData(response.data.product);
            resetOptionalFields(response.data.product); // Reset with fetched data context
            console.log("Fetched Product Data:", response.data.product);
        } catch (err) {
            console.error('Product lookup failed:', err.response ? err.response.data : err.message);
            setError(err.response?.data?.message || 'Failed to fetch product data. Check ASIN/UPC.');
            setProductData(null);
        } finally { setLoadingLookup(false); }
    };

     useEffect(() => {
        setProductData(null); setScoreResult(null); setError('');
        setCostPrice(''); // Also reset cost price
        resetOptionalFields();
    }, [identifier]);


    const handleCalculateScore = async () => {
        if (!productData || !costPrice) { setError('Please fetch product data and enter a cost price first.'); return; }
        if (isNaN(parseFloat(costPrice)) || parseFloat(costPrice) <= 0) { setError('Please enter a valid positive number for cost price.'); return; }

        setError(''); setScoreResult(null); setLoadingScore(true);
        const dataToSend = {
            ...productData,
            costPrice: parseFloat(costPrice),
            delicacyRating: parseInt(delicacyRating) || 3,
            variationsCount: parseInt(variationsCount) || 1,
            seasonality: seasonality,
            amazonSells: amazonSells,
            advertisingCostPerUnit: parseFloat(advertisingCostPerUnit) || 0,
            salesTrend: salesTrend,
            inboundPlacementOption: inboundPlacementOption,
            isDangerousGood: isDangerousGood,
            estimatedSalesPerMonth: estimatedSalesPerMonth !== '' && !isNaN(parseInt(estimatedSalesPerMonth)) ? parseInt(estimatedSalesPerMonth) : null,
            estimatedTimeToSale: estimatedTimeToSale !== '' && !isNaN(parseInt(estimatedTimeToSale)) ? parseInt(estimatedTimeToSale) : null,
            supplierDiscountRebate: parseFloat(supplierDiscountRebate) || 0
        };
        console.log("Sending data to score endpoint:", dataToSend);
        try {
            const response = await axios.post('http://localhost:5000/api/products/score', dataToSend);
            setScoreResult(response.data);
            console.log("Score Result:", response.data);
        } catch (err) {
            console.error('Score calculation failed:', err.response ? err.response.data : err.message);
            setError(err.response?.data?.message || 'Failed to calculate score.');
            setScoreResult(null);
        } finally { setLoadingScore(false); }
    };

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-6 font-sans">
            <header className="text-center mb-8">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-800">Product Potential Analyzer</h1>
                <p className="text-gray-600">Enter product details to calculate its potential score.</p>
            </header>

            {error && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-md" role="alert">
                    <p className="font-bold">Error</p>
                    <p>{error}</p>
                </div>
            )}

            <section className="mb-8 p-6 bg-white rounded-xl shadow-lg border border-gray-200">
                <h2 className="text-xl font-semibold text-gray-700 mb-4">1. Fetch Product Data</h2>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                    <label htmlFor="identifier" className="sr-only">ASIN or UPC:</label>
                    <input
                        type="text"
                        id="identifier"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        placeholder="Enter ASIN or UPC"
                        className="flex-grow p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out"
                    />
                    <button
                        onClick={handleLookup}
                        disabled={loadingLookup || !identifier}
                        className="w-full sm:w-auto px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition duration-150 ease-in-out"
                    >
                        {loadingLookup ? 'Fetching...' : 'Fetch Data'}
                    </button>
                </div>
            </section>

            {loadingLookup && <p className="text-center text-gray-600 my-6">Loading product data...</p>}

            {productData && !loadingLookup && (
                <section className="mb-8 p-6 bg-white rounded-xl shadow-lg border border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-700 mb-6">2. Provide Your Inputs</h2>

                    <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <h3 className="text-lg font-medium text-gray-800 mb-2">Fetched Product:</h3>
                        <div className="flex flex-col md:flex-row items-center gap-4 text-sm">
                            {productData.imageUrl && <img src={productData.imageUrl} alt={productData.title || 'Product'} className="w-24 h-24 border border-gray-300 object-contain rounded-md" />}
                            <div className="text-gray-700 flex-grow">
                                <p className="font-semibold text-base text-gray-900">{productData.title || 'N/A'}</p>
                                <p>ASIN: {productData.asin || 'N/A'} | Category: {productData.category || 'N/A'}</p>
                                <p>Price: {productData.sellingPrice ? `$${productData.sellingPrice}` : 'N/A'} | BSR: {productData.bsr ? `#${productData.bsr}` : 'N/A'} | FBA Sellers: {productData.fbaSellers ?? 'N/A'}</p>
                                <p>Wt: {productData.weight || 'N/A'} lbs | Dims: {productData.dimensions ? `${productData.dimensions.length}x${productData.dimensions.width}x${productData.dimensions.height}` : 'N/A'} in</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="p-4 bg-slate-50 rounded-lg border">
                            <h4 className="font-semibold text-gray-800 mb-3">Costs & Profit</h4>
                            <InputField id="costPrice" label="Your Cost Price ($):" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} placeholder="e.g., 5.99" required step="0.01" min="0" />
                            <InputField id="advertisingCostPerUnit" label="Est. Ad Cost / Unit ($):" value={advertisingCostPerUnit} onChange={(e) => setAdvertisingCostPerUnit(e.target.value)} placeholder="0.00" step="0.01" min="0" />
                            <InputField id="supplierDiscountRebate" label="Supplier Discount/Rebate ($/Unit):" value={supplierDiscountRebate} onChange={(e) => setSupplierDiscountRebate(e.target.value)} placeholder="0.00" step="0.01" min="0" />
                        </div>

                        <div className="p-4 bg-slate-50 rounded-lg border">
                            <h4 className="font-semibold text-gray-800 mb-3">Risk & Condition</h4>
                            <SelectField id="delicacyRating" label="Delicacy Rating:" value={delicacyRating} onChange={(e) => setDelicacyRating(e.target.value)}>
                                <option value="5">5 (Very Robust)</option> <option value="4">4</option> <option value="3">3 (Average)</option> <option value="2">2</option> <option value="1">1 (Very Delicate)</option>
                            </SelectField>
                            <CheckboxField id="seasonality" label="Is Seasonal?" checked={seasonality} onChange={(e) => setSeasonality(e.target.checked)} />
                            <CheckboxField id="isDangerousGood" label="Hazmat/Dangerous Good?" checked={isDangerousGood} onChange={(e) => setIsDangerousGood(e.target.checked)} />
                        </div>

                        <div className="p-4 bg-slate-50 rounded-lg border">
                             <h4 className="font-semibold text-gray-800 mb-3">Market & Competition</h4>
                             <SelectField id="salesTrend" label="Sales Trend (Recent):" value={salesTrend} onChange={(e) => setSalesTrend(e.target.value)}>
                                <option value="Growing">Growing</option> <option value="Stable">Stable</option> <option value="Declining">Declining</option>
                             </SelectField>
                             <InputField id="variationsCount" label="Number of Variations:" value={variationsCount} onChange={(e) => setVariationsCount(e.target.value)} placeholder="1" required min="1" step="1"/>
                             <CheckboxField id="amazonSells" label="Amazon Selling?" checked={amazonSells} onChange={(e) => setAmazonSells(e.target.checked)} />
                        </div>

                        <div className="p-4 bg-slate-50 rounded-lg border">
                             <h4 className="font-semibold text-gray-800 mb-3">Velocity (Optional)</h4>
                             <InputField id="estimatedSalesPerMonth" label="Est. Sales / Month:" value={estimatedSalesPerMonth} onChange={(e) => setEstimatedSalesPerMonth(e.target.value)} placeholder="e.g., 150" min="0" step="1"/>
                             <InputField id="estimatedTimeToSale" label="Est. Time to Sale (Days):" value={estimatedTimeToSale} onChange={(e) => setEstimatedTimeToSale(e.target.value)} placeholder="e.g., 45" min="0" step="1"/>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-lg border md:col-span-2 lg:col-span-1"> {/* Adjust span for layout */}
                              <h4 className="font-semibold text-gray-800 mb-3">Fulfillment</h4>
                              <SelectField id="inboundPlacementOption" label="Inbound Placement Choice:" value={inboundPlacementOption} onChange={(e) => setInboundPlacementOption(e.target.value)}>
                                    <option value="Optimized">Optimized (Free, Multi-DC)</option>
                                    <option value="Partial">Partial Split (Est. Fee)</option>
                                    <option value="Minimal">Minimal Split (Est. Fee)</option>
                              </SelectField>
                         </div>
                    </div>

                    <div className="text-center mt-8">
                        <button
                            onClick={handleCalculateScore}
                            disabled={loadingScore || !costPrice}
                            className="px-10 py-4 bg-green-600 text-white rounded-lg text-lg font-semibold hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition duration-150 ease-in-out"
                        >
                            {loadingScore ? 'Calculating...' : 'Calculate Score'}
                        </button>
                    </div>
                </section>
            )}

            {loadingScore && <p className="text-center text-gray-600 mt-8">Calculating score...</p>}

            {scoreResult && !loadingScore && (
                 <section className="mt-8 p-6 bg-white rounded-xl shadow-lg border border-gray-200">
                    <h2 className="text-2xl font-semibold text-gray-800 text-center mb-6">Score Result</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                        <div className="md:col-span-1">
                            <ScoreGauge score={scoreResult.score} />
                        </div>
                        <div className="md:col-span-2 space-y-4">
                            <p className="text-center md:text-left text-lg text-gray-600">
                                Determined Size Tier: <strong className="text-gray-800">{scoreResult.determinedSizeTier || 'N/A'}</strong>
                            </p>
                             <div className="bg-gray-100 p-4 rounded-lg border">
                                 <h4 className="font-semibold text-gray-700 mb-2">Key Metrics:</h4>
                                 <ul className="list-none p-0 m-0 space-y-1 text-sm text-gray-800">
                                     <li>Calculated ROI: <strong className="float-right">{scoreResult.calculatedRoi}%</strong></li>
                                     <li className="clear-both">Net Profit / Unit: <strong className="float-right">${scoreResult.calculatedNetProfit?.toFixed(2)}</strong></li>
                                     <li className="clear-both">Total Estimated Fees: <strong className="float-right">${scoreResult.estimatedFees?.toFixed(2)}</strong></li>
                                     <li className="clear-both">Est. Monthly Storage: <strong className="float-right">${scoreResult.estimatedMonthlyStorageCost?.toFixed(2)}</strong></li>
                                 </ul>
                            </div>
                        </div>
                    </div>

                    {scoreResult.warnings && scoreResult.warnings.length > 0 && (
                        <div className="mt-6">
                            <h4 className="font-semibold text-gray-700 mb-3">Alerts:</h4>
                            <div className="space-y-2">
                            {scoreResult.warnings.map((warning, index) => (
                                <WarningItem key={index} level={warning.level} metric={warning.metric} message={warning.message} />
                            ))}
                            </div>
                        </div>
                    )}

                    <div className="mt-6 bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                        <h4 className="font-semibold text-indigo-800 mt-0 mb-2">Explanation:</h4>
                        <p className="m-0 text-sm text-indigo-700">{scoreResult.explanation || 'No explanation provided.'}</p>
                    </div>
                </section>
            )}
        </div>
    );
}

export default ProductInputPage;