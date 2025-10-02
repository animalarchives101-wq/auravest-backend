// models/WithdrawalSetting.js
const mongoose = require('mongoose');

const METHODS = { PAYPAL: 3, BANK: 5, CRYPTO: 8 };

const WithdrawalSettingSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    // common
    type: { type: Number, enum: [METHODS.PAYPAL, METHODS.BANK, METHODS.CRYPTO], required: true },
    default_payout: { type: Number, enum: [0, 1], default: 0 },

    // paypal
    email: { type: String, trim: true },

    // bank
    account_name: { type: String, trim: true },
    account_number: { type: String, trim: true },
    bank_name: { type: String, trim: true },
    bank_branch_name: { type: String, trim: true },
    bank_branch_city: { type: String, trim: true },
    bank_branch_address: { type: String, trim: true },
    country: { type: mongoose.Schema.Types.Mixed }, // store id or code (your choice)
    swift_code: { type: String, trim: true },

    // crypto
    currency: { type: String, trim: true },        // e.g. "BTC"
    crypto_address: { type: String, trim: true },
  },
  { timestamps: true }
);

// helpful compound index for user/type filters
WithdrawalSettingSchema.index({ userId: 1, type: 1 });

module.exports = {
  WithdrawalSetting: mongoose.model('WithdrawalSetting', WithdrawalSettingSchema),
  METHODS,
};
