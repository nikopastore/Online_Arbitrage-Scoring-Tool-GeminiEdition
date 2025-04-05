// server/src/controllers/authController.js
const User = require('../models/User'); // User model
const jwt = require('jsonwebtoken'); // JWT for token generation
// Make sure to require 'dotenv' at the top of your main server.js file
// and load it: require('dotenv').config();

// Function to generate JWT token
const generateToken = (userId) => {
    // Use a secret key from your environment variables
    // Ensure JWT_SECRET is set in your .env file!
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
        expiresIn: '30d', // Token expiry (e.g., 30 days)
    });
};

// Register User Logic
exports.registerUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Basic validation (add more robust validation later)
        if (!email || !password) {
            return res.status(400).json({ message: 'Please provide email and password' });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists with this email' });
        }

        // Create new user (password will be hashed by the 'pre save' hook in User.js)
        const newUser = new User({ email, password });
        await newUser.save();

        // Generate token and respond
        const token = generateToken(newUser._id);
        res.status(201).json({ // 201 Created status
            message: 'User registered successfully',
            token, // Send token back to client
            user: { // Optionally send back some user info (excluding password)
                id: newUser._id,
                email: newUser.email,
            },
        });

    } catch (error) {
        console.error('Registration Error:', error);
        res.status(500).json({ message: 'Server error during registration' });
    }
};

// Login User Logic
exports.loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
         // Basic validation
        if (!email || !password) {
            return res.status(400).json({ message: 'Please provide email and password' });
        }

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' }); // 401 Unauthorized
        }

        // Compare submitted password with stored hashed password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' }); // 401 Unauthorized
        }

        // Generate token and respond
        const token = generateToken(user._id);
        res.status(200).json({ // 200 OK status
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                email: user.email,
            },
        });

    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ message: 'Server error during login' });
    }
};