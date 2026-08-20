import mongoose from 'mongoose';

const inventoryItemSchema = new mongoose.Schema({
  itemName: {
    type: String,
    required: true,
    unique: true,
  },
  category: {
    type: String,
    enum: ['Medicine', 'Equipment', 'PPE', 'Consumables', 'Other'],
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    default: 0,
  },
  unit: {
    type: String,
    required: true,
    default: 'units' // e.g., 'boxes', 'cylinders', 'tablets'
  },
  lowStockThreshold: {
    type: Number,
    required: true,
    default: 10,
  },
  status: {
    type: String,
    enum: ['In Stock', 'Low Stock', 'Out of Stock'],
    default: 'In Stock'
  },
  lastRestocked: {
    type: Date,
    default: Date.now,
  }
}, { timestamps: true });

// Pre-save middleware to automatically update status based on quantity
inventoryItemSchema.pre('save', function(next) {
  if (this.quantity === 0) {
    this.status = 'Out of Stock';
  } else if (this.quantity <= this.lowStockThreshold) {
    this.status = 'Low Stock';
  } else {
    this.status = 'In Stock';
  }
  next();
});

export default mongoose.model('InventoryItem', inventoryItemSchema);
