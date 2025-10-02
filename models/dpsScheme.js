const mongoose = require('mongoose');

const dpsScheme = new mongoose.Schema({
    plan: {
        type: String,
        required: true,
        enum: ['Starter', 'Basic', 'Professional'] // Allowed plans
    },
    userEmail: {
        type: String,
        required: true
    },
    currency: {
        type: String,
        required: true
    },
    interestRate: {
        type: Number,
        required: true, // Annual interest rate
    },
    perInstallment: {
        type: Number,
        required: true
    },
    installmentInterval: {
        type: String,
        required: true,
        enum: ['Every 1 Month', 'Every 3 Months', 'Every 6 Months'] // Adjust as necessary
    },
    totalDeposit: {
        type: Number,
        required: true // Total deposited amount by user
    },
    maturedAmount: {
        type: Number,
        required: true // Amount at maturity (totalDeposit + interest)
    },
    totalPayableAmount: {
        type: Number,
        required: true // Total amount payable for the plan
    },
    totalPaid: {
        type: Number,
        default: 0 // Amount paid so far
    },
    status: {
        type: String,
        enum: ['approved', 'rejected', 'pending'],
        default: 'pending'
    }
}, { timestamps: true });

const DpsModel = mongoose.model('dps_model', dpsScheme);

module.exports = DpsModel;
