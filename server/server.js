// server/server.js (Basic Example - Expand Later)
require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const cors = require('cors');
// Add database connection logic import later: const connectDB = require('./src/config/db');

const authRoutes = require('./src/routes/authRoutes'); // Import auth routes

const app = express();

// Connect to Database (implement connectDB in src/config/db.js later)
// connectDB();

// Middleware
app.use(cors()); // Enable CORS for all origins (configure more strictly later)
app.use(express.json()); // Parse JSON request bodies

// Define Routes
app.get('/', (req, res) => res.send('API Running')); // Basic test route
app.use('/api/auth', authRoutes); // Use auth routes under /api/auth prefix

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));