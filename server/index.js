import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import bedRoutes from './routes/beds.js';
import patientRoutes from './routes/patients.js';
import inventoryRoutes from './routes/inventory.js';
import resourceRequestRoutes from './routes/resourceRequests.js';
import medicalRecordRoutes from './routes/medicalRecords.js';
import userRoutes from './routes/users.js';
import searchRoutes from './routes/search.js';
import dashboardRoutes from './routes/dashboard.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hospitalbed';

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/beds', bedRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/resource-requests', resourceRequestRoutes);
app.use('/api/medical-records', medicalRecordRoutes);
app.use('/api/users', userRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/dashboard', dashboardRoutes);

import { MongoMemoryServer } from 'mongodb-memory-server';

// MongoDB Connection Logic with Fallback
const connectDB = async () => {
  try {
    // Attempt to connect to the provided or default local URI
    console.log(`Attempting to connect to MongoDB at: ${MONGO_URI}`);
    await mongoose.connect(MONGO_URI);
    console.log('Successfully connected to primary MongoDB');
  } catch (err) {
    console.log('Failed to connect to primary MongoDB. Starting in-memory fallback server...');
    
    // Fallback to In-Memory MongoDB Server if local/Atlas fails
    const mongoServer = await MongoMemoryServer.create();
    const fallbackUri = mongoServer.getUri();
    
    await mongoose.connect(fallbackUri);
    console.log(`Successfully connected to Fallback In-Memory MongoDB at: ${fallbackUri}`);
  }

  // Start Express Server
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
};

connectDB();
