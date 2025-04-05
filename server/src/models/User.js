// server/src/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt'); // Import bcrypt here

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    password: {
        type: String,
        required: true,
    },
    // Add other fields later: subscriptionStatus, subscriptionExpiry, etc.
}, { timestamps: true }); // Adds createdAt and updatedAt timestamps

// **Password Hashing Middleware (IMPORTANT!)**
// This runs BEFORE saving a user document
userSchema.pre('save', async function (next) {
    // Only hash the password if it has been modified (or is new)
    if (!this.isModified('password')) return next();

    try {
        const salt = await bcrypt.genSalt(10); // Generate salt
        this.password = await bcrypt.hash(this.password, salt); // Hash password
        next();
    } catch (error) {
        next(error); // Pass error to the next middleware/handler
    }
});

// Method to compare submitted password with hashed password in DB
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error; // Re-throw error to be caught by caller
  }
};


module.exports = mongoose.model('User', userSchema);