const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema({
  url: { type: String },
  filename: { type: String },
  mimetype: { type: String },
  size: { type: Number }
});

const ticketSchema = new mongoose.Schema(
  {
    ticketId: {
      type: String,
      required: true,
      unique: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    userEmail: {
      type: String,
      required: true
    },
    subject: {
      type: String,
      required: true,
      trim: true
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High'],
      default: 'Low'
    },
    status: {
      type: String,
      enum: ['Open', 'In Progress', 'Resolved', 'Closed'],
      default: 'Open'
    },
    attachments: [attachmentSchema],
    lastMessageAt: {
      type: Date,
      default: Date.now
    },
    lastSender: {
      type: String,
      enum: ['user', 'admin']
    },
    unreadByUser: {
      type: Number,
      default: 0
    },
    unreadByAdmin: {
      type: Number,
      default: 0
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

// Auto-generate ticketId if missing
ticketSchema.pre('validate', function (next) {
  if (!this.ticketId) {
    this.ticketId = 'TCKT-' + Math.random().toString(36).substring(2, 10).toUpperCase();
  }
  next();
});

ticketSchema.index({ lastMessageAt: -1 });
ticketSchema.index({ status: 1 });
ticketSchema.index({ priority: 1 });

module.exports = mongoose.model('Ticket', ticketSchema);
