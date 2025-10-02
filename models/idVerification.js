const mongoose = require('mongoose');

const IdentityVerificationSchema = new mongoose.Schema({
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
  identity_type: {
    type: String,
    required: [true, 'Identity type is required'],
    enum: {
      values: ['national_id', 'driving_license', 'passport'],
      message: 'Identity type must be national_id, driving_license, or passport'
    }
  },
  identity_number: {
    type: String,
    required: [true, 'Identity number is required'],
    trim: true,
    uppercase: true
  },
  identity_file: {
    type: String,
    required: [true, 'Identity file is required']
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
IdentityVerificationSchema.index({ user: 1 });
IdentityVerificationSchema.index({ userEmail: 1 });
IdentityVerificationSchema.index({ status: 1 });
IdentityVerificationSchema.index({ submitted_at: -1 });

// Prevent duplicate pending verifications for same user
IdentityVerificationSchema.index({ 
  user: 1, 
  status: 1 
}, { 
  unique: true, 
  partialFilterExpression: { status: 'pending' } 
});

module.exports = mongoose.model('IdentityVerification', IdentityVerificationSchema);