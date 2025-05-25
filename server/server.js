// server/server.js
require('dotenv').config(); // Load environment variables from .env file
console.log('--- DEBUG --- MONGO_URI loaded:', process.env.MONGO_URI); // <<< ADD THIS LINE
console.log('--- DEBUG --- PORT loaded:', process.env.PORT); // <<< Also check PORT
console.log('--- DEBUG --- JWT_SECRET loaded:', process.env.JWT_SECRET); // <<< Also check SECRET
const express = require('express');
const cors = require('cors');
const connectDB = require('./src/config/db'); // Import connectDB

// Import Routes
const authRoutes = require('./src/routes/authRoutes');
const productRoutes = require('./src/routes/productRoutes'); // Import product routes

// Connect to Database
connectDB();

const app = express();

// Middleware
app.use(cors()); // Enable CORS for all origins (configure more strictly later)
app.use(express.json()); // Parse JSON request bodies

// Define Routes
app.get('/', (req, res) => res.send('API Running')); // Basic test route
app.use('/api/auth', authRoutes); // Use auth routes under /api/auth prefix
app.use('/api/products', productRoutes); // Use product routes under /api/products prefix

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));