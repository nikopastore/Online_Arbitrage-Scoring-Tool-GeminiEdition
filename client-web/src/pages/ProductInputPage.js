// client-web/src/pages/ProductInputPage.js
import React, { useState } from 'react';
import axios from 'axios';
// Import scoring display component later: import ScoreDisplay from '../components/ScoreDisplay';
// Import Auth Context if needed to pass token: import { useAuth } from '../contexts/AuthContext';

function ProductInputPage() {
    const [identifier, setIdentifier] = useState(''); // For ASIN or UPC
    const [productData, setProductData] = useState(null); // Store fetched data
    const [costPrice, setCostPrice] = useState(''); // User input for cost
    const [scoreResult, setScoreResult] = useState(null); // Store score + explanation
    const [loadingLookup, setLoadingLookup] = useState(false);
    const [loadingScore, setLoadingScore] = useState(false);
    const [error, setError] = useState('');
    // const { token } = useAuth(); // Get auth token if API needs it

    // Handle fetching product data from Amazon via our backend
    const handleLookup = async () => {
        setError('');
        setProductData(null); // Clear previous data
        setScoreResult(null); // Clear previous score
        setLoadingLookup(true);

        try {
            // TODO: Add authentication headers if needed:
            // const config = { headers: { Authorization: `Bearer ${token}` } };
            // Replace with your actual backend lookup endpoint
            const response = await axios.post('http://localhost:5000/api/products/lookup',
               { identifier } // Send ASIN/UPC in request body
               // , config // Pass config if using auth
            );
            setProductData(response.data.product); // Assuming backend returns { product: {...} }
            console.log("Fetched Product Data:", response.data.product);

        } catch (err) {
            console.error('Product lookup failed:', err.response ? err.response.data : err.message);
            setError(err.response?.data?.message || 'Failed to fetch product data. Check ASIN/UPC.');
            setProductData(null);
        } finally {
            setLoadingLookup(false);
        }
    };

    // Handle calculating the score via our backend
    const handleCalculateScore = async () => {
        if (!productData || !costPrice) {
            setError('Please fetch product data and enter a cost price first.');
            return;
        }
         if (isNaN(parseFloat(costPrice)) || parseFloat(costPrice) <= 0) {
            setError('Please enter a valid positive number for cost price.');
            return;
        }

        setError('');
        setScoreResult(null);
        setLoadingScore(true);

        const dataToSend = {
            ...productData, // Include all fetched data (BSR, sellers, weight, etc.)
            costPrice: parseFloat(costPrice), // Add the user's cost price
        };

        try {
             // TODO: Add authentication headers if needed
             // const config = { headers: { Authorization: `Bearer ${token}` } };
            // Replace with your actual backend scoring endpoint
             const response = await axios.post('http://localhost:5000/api/products/score',
                dataToSend // Send combined data
                // , config
             );
             setScoreResult(response.data); // Assuming backend returns { score: number, explanation: string }
             console.log("Score Result:", response.data);

        } catch (err) {
             console.error('Score calculation failed:', err.response ? err.response.data : err.message);
            setError(err.response?.data?.message || 'Failed to calculate score.');
            setScoreResult(null);
        } finally {
            setLoadingScore(false);
        }
    };

    return (
        <div>
            <h1>Analyze Product</h1>
            {error && <p style={{ color: 'red' }}>{error}</p>}

            {/* Input Section */}
            <div>
                <label htmlFor="identifier">ASIN or UPC:</label>
                <input
                    type="text"
                    id="identifier"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Enter ASIN or UPC"
                />
                <button onClick={handleLookup} disabled={loadingLookup || !identifier}>
                    {loadingLookup ? 'Fetching...' : 'Fetch Product Data'}
                </button>
                {/* Barcode Scan Button - Implement in React Native App later */}
                {/* <button>Scan Barcode</button> */}
            </div>

            {/* Fetched Data Display Section */}
            {loadingLookup && <p>Loading product data...</p>}
            {productData && !loadingLookup && (
                <div style={{ border: '1px solid #ccc', margin: '1em 0', padding: '1em' }}>
                    <h3>Fetched Product Details</h3>
                    <p><strong>Title:</strong> {productData.title || 'N/A'}</p>
                    {productData.imageUrl && <img src={productData.imageUrl} alt={productData.title} style={{maxWidth: '100px', maxHeight: '100px'}} />}
                    <p><strong>BSR:</strong> {productData.bsr ? `#${productData.bsr} in ${productData.category || 'N/A'}` : 'N/A'}</p>
                    <p><strong>Selling Price:</strong> {productData.sellingPrice ? `$${productData.sellingPrice}` : 'N/A'}</p>
                    <p><strong>FBA Sellers:</strong> {productData.fbaSellers ?? 'N/A'}</p>
                    <p><strong>Weight:</strong> {productData.weight ? `${productData.weight} lbs` : 'N/A'}</p>
                    {/* Add other relevant fields: Dimensions, Total Sellers etc. */}

                    {/* Cost Price Input */}
                    <div>
                        <label htmlFor="costPrice">Your Cost Price ($):</label>
                        <input
                            type="number"
                            id="costPrice"
                            value={costPrice}
                            onChange={(e) => setCostPrice(e.target.value)}
                            placeholder="e.g., 5.99"
                            required
                            step="0.01"
                            min="0"
                        />
                     </div>
                     <button onClick={handleCalculateScore} disabled={loadingScore || !costPrice}>
                       {loadingScore ? 'Calculating...' : 'Calculate Score'}
                     </button>
                </div>
            )}

            {/* Score Result Display Section */}
            {loadingScore && <p>Calculating score...</p>}
            {scoreResult && !loadingScore && (
                 <div style={{ border: '1px solid green', margin: '1em 0', padding: '1em' }}>
                    <h3>Score Result</h3>
                     {/* Add Score Visualization Component Here */}
                    <p style={{ fontSize: '2em', fontWeight: 'bold' }}>Score: {scoreResult.score}/100</p>
                    <h4>Explanation:</h4>
                    <p>{scoreResult.explanation || 'No explanation provided.'}</p>
                </div>
                 // <ScoreDisplay score={scoreResult.score} explanation={scoreResult.explanation} />
            )}
        </div>
    );
}

export default ProductInputPage;