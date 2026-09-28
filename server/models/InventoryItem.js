import mongoose from 'mongoose';

const inventoryItemSchema = new mongoose.Schema({
  resourceId: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
  itemName: {
    type: String,
    required: true,
    trim: true,
    unique: true,
  },
  resourceType: {
    type: String,
    enum: [
      'Ventilator',
      'Oxygen Cylinder',
      'Cardiac Monitor',
      'Infusion Pump',
      'Wheelchair',
      'Defibrillator',
      'Dialysis Machine',
      'Suction Machine',
      'Medical Equipment',
      'Other'
    ],
    default: 'Medical Equipment'
  },
  category: {
    type: String,
    enum: ['Medicine', 'Equipment', 'PPE', 'Consumables', 'Other'],
    default: 'Equipment',
    required: true,
  },
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier'
  },
  supplierName: {
    type: String,
    trim: true,
    default: ''
  },
  supplierContact: {
    type: String,
    trim: true,
    default: ''
  },
  quantity: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  availableQuantity: {
    type: Number,
    default: 0,
    min: 0
  },
  allocatedQuantity: {
    type: Number,
    default: 0,
    min: 0
  },
  inUseQuantity: {
    type: Number,
    default: 0,
    min: 0
  },
  maintenanceQuantity: {
    type: Number,
    default: 0,
    min: 0
  },
  unit: {
    type: String,
    required: true,
    default: 'units' // e.g., 'units', 'cylinders', 'boxes'
  },
  condition: {
    type: String,
    enum: ['New', 'Good', 'Fair', 'Needs Maintenance', 'Defective'],
    default: 'Good'
  },
  purchaseDate: {
    type: Date,
    default: Date.now
  },
  locationWard: {
    type: String,
    default: 'Central Equipment Store'
  },
  lowStockThreshold: {
    type: Number,
    required: true,
    default: 5,
  },
  status: {
    type: String,
    enum: ['In Stock', 'Low Stock', 'Out of Stock', 'Maintenance'],
    default: 'In Stock'
  },
  lastRestocked: {
    type: Date,
    default: Date.now,
  }
}, { timestamps: true });

// Pre-save middleware to automatically calculate available quantity and status
inventoryItemSchema.pre('save', function () {
  if (this.availableQuantity === undefined || this.availableQuantity === null) {
    this.availableQuantity = Math.max(0, this.quantity - (this.allocatedQuantity || 0) - (this.inUseQuantity || 0) - (this.maintenanceQuantity || 0));
  }

  const effectiveAvail = this.availableQuantity !== undefined ? this.availableQuantity : this.quantity;
  if (effectiveAvail <= 0) {
    this.status = 'Out of Stock';
  } else if (effectiveAvail <= this.lowStockThreshold) {
    this.status = 'Low Stock';
  } else {
    this.status = 'In Stock';
  }
});

export default mongoose.model('InventoryItem', inventoryItemSchema);
