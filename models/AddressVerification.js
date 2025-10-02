const mongoose = require('mongoose');

const AddressVerificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  userEmail: {
    type: String,
    required: [true, 'User email is required'],
    trim: true,
    lowercase: true
  },
  address_file: {
    type: String,
    required: [true, 'Address proof file is required']
  },
  status: {
    type: String,
    enum: {
      values: ['pending', 'verified', 'rejected'],
      message: 'Status must be pending, verified, or rejected'
    },
    default: 'pending'
  },
  submitted_at: {
    type: Date,
    default: Date.now
  },
  reviewed_at: {
    type: Date
  },
  reviewed_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rejection_reason: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Index for faster queries
AddressVerificationSchema.index({ user: 1 });
AddressVerificationSchema.index({ userEmail: 1 });
AddressVerificationSchema.index({ status: 1 });

// Prevent duplicate pending verifications for same user
AddressVerificationSchema.index({ 
  user: 1, 
  status: 1 
}, { 
  unique: true, 
  partialFilterExpression: { status: 'pending' } 
});

module.exports = mongoose.model('AddressVerification', AddressVerificationSchema);