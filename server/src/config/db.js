// server/src/config/db.js
const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // Ensure your MONGO_URI is correctly set in your /server/.env file
        if (!process.env.MONGO_URI) {
            console.error('FATAL ERROR: MONGO_URI is not defined in .env file');
            process.exit(1);
        }
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            // Mongoose 6+ handles these options automatically, but keeping them doesn't hurt
            // useNewUrlParser: true,
            // useUnifiedTopology: true,
        });

        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error connecting to MongoDB: ${error.message}`);
        // Exit process with failure
        process.exit(1);
    }
};

module.exports = connectDB;