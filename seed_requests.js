import mongoose from 'mongoose';
import ResourceRequest from './server/models/ResourceRequest.js';
import InventoryItem from './server/models/InventoryItem.js';
import User from './server/models/User.js';
import dotenv from 'dotenv';

dotenv.config();

async function run() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hospitalbed';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const user = await User.findOne({ role: 'Nurse' });
    if (!user) {
        console.log('No nurse user found to request items.');
        process.exit(1);
    }

    // Ensure we have some inventory items
    let medItem = await InventoryItem.findOne({ category: 'Medicine' });
    if (!medItem) {
        medItem = await InventoryItem.create({
            itemName: 'Paracetamol',
            category: 'Medicine',
            quantity: 100,
            unit: 'Tablets',
            reorderLevel: 20
        });
    }

    let eqItem = await InventoryItem.findOne({ category: 'Equipment' });
    if (!eqItem) {
        eqItem = await InventoryItem.create({
            itemName: 'O2 Cylinder',
            category: 'Equipment',
            quantity: 10,
            unit: 'Tanks',
            reorderLevel: 2
        });
    }

    // Seed requests
    await ResourceRequest.create({
        requestedBy: user._id,
        itemRequested: medItem._id,
        quantity: 5,
        urgency: 'Normal',
        status: 'Pending'
    });

    await ResourceRequest.create({
        requestedBy: user._id,
        itemRequested: eqItem._id,
        quantity: 1,
        urgency: 'High',
        status: 'Pending'
    });

    console.log('Resource requests seeded successfully!');
    process.exit(0);

  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
