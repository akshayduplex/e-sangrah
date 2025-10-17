import mongoose from 'mongoose';
import logger from '../utils/logger.js';

export const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        logger.info('Connected to MongoDB');
    } catch (err) {
        logger.error('MongoDB connection error:', err);
        process.exit(1);
    }
};
