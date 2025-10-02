const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema({
  url: { type: String },
  filename: { type: String },
  mimetype: { type: String },
  size: { type: Number }
});

const replySchema = new mongoose.Schema(
  {
    ticketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ticket',
      required: true
    },
    sender: {
      type: String,
      enum: ['user', 'admin'],
      required: true
    },
    message: {
      type: String,
      required: true,
      trim: true
    },
    attachments: [attachmentSchema],
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

replySchema.index({ ticketId: 1, createdAt: 1 });

module.exports = mongoose.model('Reply', replySchema);
