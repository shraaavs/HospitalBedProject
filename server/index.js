import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import bedRoutes from './routes/beds.js';
import patientRoutes from './routes/patients.js';
import inventoryRoutes from './routes/inventory.js';
import resourceRequestRoutes from './routes/resourceRequests.js';
import medicalRecordRoutes from './routes/medicalRecords.js';
import searchRoutes from './routes/search.js';
import dashboardRoutes from './routes/dashboard.js';
import nursingTasksRoutes from './routes/nursingTasks.js';
import appointmentRoutes from './routes/appointments.js';
import prescriptionRoutes from './routes/prescriptions.js';
import vitalRoutes from './routes/vitals.js';
import admissionRequestRoutes from './routes/admissionRequests.js';
import emergencyRoutes from './routes/emergency.js';
import transferDischargeRoutes from './routes/transferDischarge.js';
import notificationRoutes from './routes/notifications.js';
import userRoutes from './routes/users.js';
import nursingObservationsRoutes from './routes/nursingObservations.js';
import medicationAdministrationsRoutes from './routes/medicationAdministrations.js';
import doctorInstructionsRoutes from './routes/doctorInstructions.js';
import analyticsRoutes from './routes/analytics.js';
import settingsRoutes from './routes/settings.js';
import supplierRoutes from './routes/suppliers.js';
import { getDoctorsListHandler } from './routes/users.js';
import { protect } from './middleware/authMiddleware.js';

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hospitalbed';

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/beds', bedRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/resource-requests', resourceRequestRoutes);
app.use('/api/medical-records', medicalRecordRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/nursing-tasks', nursingTasksRoutes);
app.use('/api/nursing-observations', nursingObservationsRoutes);
app.use('/api/medication-administrations', medicationAdministrationsRoutes);
app.use('/api/doctor-instructions', doctorInstructionsRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/vitals', vitalRoutes);
app.use('/api/admission-requests', admissionRequestRoutes);
app.use('/api/admissions', admissionRequestRoutes);
app.use('/api/emergency', emergencyRoutes);
app.use('/api/transfer-discharge', transferDischargeRoutes);
app.use('/api/transfers', transferDischargeRoutes);
app.use('/api/discharges', transferDischargeRoutes);
app.use('/api/discharge-bills', transferDischargeRoutes);
app.use('/api/resources', resourceRequestRoutes);
app.use('/api/notifications', notificationRoutes);
app.get('/api/doctors', protect, getDoctorsListHandler);





import http from 'http';
import { Server } from 'socket.io';
import { setIO } from './socket.js';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { seedDefaultAccounts } from './services/seedAccounts.js';

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

setIO(io);

io.on('connection', (socket) => {
  console.log(`⚡ Real-time client connected: ${socket.id}`);

  socket.on('JOIN_ROOM', (roomName) => {
    socket.join(roomName);
    console.log(`Socket ${socket.id} joined room: ${roomName}`);
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

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

  // Ensure default documented accounts are active and properly hashed
  await seedDefaultAccounts();

  // Start HTTP Server with Socket.IO
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Hospital Server & Socket.IO running on port ${PORT}`);
  });
};

connectDB();

