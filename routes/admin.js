const express = require('express')
const { 
  createAdmin, loginAdmin, sendEmail, checkToken, updateUserBalance, 
  deleteUser, acceptLoan, approveDPS, getAllDeposits, getTickets, 
  users, getFixDeposits, deleteTicket, chnageDepositStatus, deleteDeposit,
  getLoans, deleteLoan, deletCard, cardStatus, giftCard, fixedDepositStatus, 
  deleteFixedDeposit, isAdmin
} = require('../controllers/admin')
const upload = require('../middleware/multerUpload')
const auth = require('../middleware/auth')
const router = express.Router()

const TicketModel = require('../models/ticket');
const Reply = require('../models/reply');
const { StatusCodes } = require('http-status-codes');
const customErrorAPI = require('../customError/customError');
 // Adjust path as needed

// Existing routes
router.route('/create-admin').post(createAdmin)
router.route('/login-admin').post(loginAdmin)
router.route('/send-email').post(sendEmail)
router.route('/check-token').get(auth, checkToken)
router.route('/update-balance/:userId').post(auth, updateUserBalance)
router.route('/delete-user/:userId').delete(auth, deleteUser)
router.route('/loan/:loanId').post(auth, acceptLoan)
router.route('/dps/:dpsId').post(auth, approveDPS)
router.route('/deposits/').get(auth, getAllDeposits)
router.route('/deposit/:depositId').post(auth, chnageDepositStatus)
router.route('/tickets/').get(auth, getTickets)
router.route('/users/').get(auth, users)
router.route('/loans/').get(auth, getLoans)
router.route('/delete-loan/:loanId').delete(auth, deleteLoan)
router.route('/delete-ticket/:tId').delete(auth, deleteTicket)
router.route('/delete-deposit/:depositId').delete(auth, deleteDeposit)
router.route('/gift-card/').get(auth, giftCard)
router.route('/isadmin').get(auth, isAdmin)
router.route('/gift-card-status/:cardId').post(auth, cardStatus)
router.route('/delete-card/:cardId').delete(auth, deletCard)
router.route('/get-fd/').get(auth, getFixDeposits)
router.route('/fd-status/:fdId').post(auth, fixedDepositStatus)
router.route('/delete-fd/:fdId').delete(auth, deleteFixedDeposit)

// New Admin Ticket Routes with Controllers
router.route('/tickets/list').get(auth, async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      priority, 
      search,
      sortBy = 'lastMessageAt',
      sortOrder = 'desc'
    } = req.query;

    const pg = Math.max(parseInt(page, 10) || 1, 1);
    const lm = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    
    // Build filter
    const filter = {};
    
    if (status && status !== 'all') {
      filter.status = status;
    }
    
    if (priority && priority !== 'all') {
      filter.priority = priority;
    }
    
    if (search) {
      filter.$or = [
        { subject: { $regex: search, $options: 'i' } },
        { userEmail: { $regex: search, $options: 'i' } },
        { ticketId: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const [tickets, total] = await Promise.all([
      TicketModel.find(filter)
        .sort(sort)
        .skip((pg - 1) * lm)
        .limit(lm)
        .select('-__v')
        .lean(),
      TicketModel.countDocuments(filter)
    ]);

    res.status(StatusCodes.OK).json({
      success: true,
      tickets,
      pagination: {
        page: pg,
        limit: lm,
        total,
        pages: Math.ceil(total / lm)
      }
    });
  } catch (err) {
    next(err);
  }
});

router.route('/ticket/:id').get(auth, async (req, res, next) => {
  try {
    const ticketId = req.params.id;
    const ticket = await TicketModel.findById(ticketId);
    
    if (!ticket) {
      throw new customErrorAPI('Ticket not found', StatusCodes.NOT_FOUND);
    }

    const replies = await Reply.find({ ticketId }).sort({ createdAt: 1 });

    res.status(StatusCodes.OK).json({ 
      success: true,
      ticket, 
      replies 
    });
  } catch (err) {
    next(err);
  }
});

router.route('/ticket/:id/replies').get(auth, async (req, res, next) => {
  try {
    const ticketId = req.params.id;
    
    const ticket = await TicketModel.findById(ticketId).lean();
    if (!ticket) {
      throw new customErrorAPI('Ticket not found', StatusCodes.NOT_FOUND);
    }

    const { page = 1, limit = 50, since } = req.query;
    const pg = Math.max(parseInt(page, 10) || 1, 1);
    const lm = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);

    const filter = { ticketId };
    if (since) {
      const t = new Date(since);
      if (!isNaN(t.getTime())) filter.createdAt = { $gt: t };
    }

    const [replies, total] = await Promise.all([
      Reply.find(filter)
        .sort({ createdAt: 1 })
        .skip((pg - 1) * lm)
        .limit(lm)
        .lean(),
      Reply.countDocuments({ ticketId })
    ]);

    res.status(StatusCodes.OK).json({
      success: true,
      ticket: { 
        _id: ticket._id, 
        ticketId: ticket.ticketId, 
        subject: ticket.subject, 
        status: ticket.status,
        userEmail: ticket.userEmail,
        userId: ticket.userId,
        priority: ticket.priority
      },
      page: pg,
      limit: lm,
      total,
      count: replies.length,
      replies
    });
  } catch (err) {
    next(err);
  }
});

router.route('/ticket/:id/reply').post(auth, async (req, res, next) => {
  try {
    console.log(req.body)
    const { message, attachments = [] } = req.body;
    const ticketId = req.params.id;
    const adminId = req.user?.id;

    if (!message || message.trim().length === 0) {
      throw new customErrorAPI('Message is required', StatusCodes.BAD_REQUEST);
    }

    const ticket = await TicketModel.findById(ticketId);
    console.log(ticket)
    if (!ticket) {
      throw new customErrorAPI('Ticket not found', StatusCodes.NOT_FOUND);
    }

    // Create reply
    await Reply.create({
      ticketId,
      sender: 'admin',
      message: message.trim(),
      attachments,
      adminId
    });

    // Update ticket metadata
    ticket.lastMessageAt = new Date();
    ticket.lastSender = 'admin';
    ticket.unreadByUser = (ticket.unreadByUser || 0) + 1;
    ticket.updatedAt = new Date();
    await ticket.save();

    res.status(StatusCodes.OK).json({ 
      success: true,
      message: 'Reply sent successfully'
    });
  } catch (err) {
    next(err);
  }
});

router.route('/ticket/:id/status').patch(auth, async (req, res, next) => {
  try {
    const { status } = req.body;
    const ticketId = req.params.id;

    const validStatuses = ['Open', 'In Progress', 'Resolved', 'Closed'];
    if (!validStatuses.includes(status)) {
      throw new customErrorAPI('Invalid status', StatusCodes.BAD_REQUEST);
    }

    const ticket = await TicketModel.findByIdAndUpdate(
      ticketId,
      { 
        status,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );

    if (!ticket) {
      throw new customErrorAPI('Ticket not found', StatusCodes.NOT_FOUND);
    }

    res.status(StatusCodes.OK).json({
      success: true,
      message: `Ticket status updated to ${status}`,
      ticket: {
        _id: ticket._id,
        ticketId: ticket.ticketId,
        status: ticket.status
      }
    });
  } catch (err) {
    next(err);
  }
});

router.route('/ticket/:id/assign').patch(auth, async (req, res, next) => {
  try {
    const { assignedAdmin } = req.body;
    const ticketId = req.params.id;

    const ticket = await TicketModel.findByIdAndUpdate(
      ticketId,
      { 
        assignedAdmin,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );

    if (!ticket) {
      throw new customErrorAPI('Ticket not found', StatusCodes.NOT_FOUND);
    }

    res.status(StatusCodes.OK).json({
      success: true,
      message: `Ticket assigned to admin`,
      ticket: {
        _id: ticket._id,
        ticketId: ticket.ticketId,
        assignedAdmin: ticket.assignedAdmin
      }
    });
  } catch (err) {
    next(err);
  }
});


// ===== WITHDRAWAL ADMIN ROUTES =====
const WithdrawModel = require('../models/withdraw');

// Get all withdrawals
router.route('/withdrawals').get(auth, async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const pg = Math.max(parseInt(page, 10) || 1, 1);
    const lm = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

    // Build filter
    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (search) {
      filter.$or = [
        { userEmail: { $regex: search, $options: 'i' } },
        { currency: { $regex: search, $options: 'i' } },
        { trx: { $regex: search, $options: 'i' } },
      ];
    }

    // Sorting
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const [withdrawals, total] = await Promise.all([
      WithdrawModel.find(filter)
        .sort(sort)
        .skip((pg - 1) * lm)
        .limit(lm)
        .select('-__v')
        .lean(),
      WithdrawModel.countDocuments(filter),
    ]);

    res.status(StatusCodes.OK).json({
      success: true,
      withdrawals,
      pagination: {
        page: pg,
        limit: lm,
        total,
        pages: Math.ceil(total / lm),
      },
    });
  } catch (err) {
    next(err);
  }
});

// Get single withdrawal
router.route('/withdraw/:id').get(auth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const withdraw = await WithdrawModel.findById(id);

    if (!withdraw) {
      throw new customErrorAPI('Withdrawal not found', StatusCodes.NOT_FOUND);
    }

    res.status(StatusCodes.OK).json({
      success: true,
      withdraw,
    });
  } catch (err) {
    next(err);
  }
});

// Update withdrawal status (pending → approved)
router.route('/withdraw/:id/status').patch(auth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'approved','failed','cancelled'];
    if (!validStatuses.includes(status)) {
      throw new customErrorAPI('Invalid status', StatusCodes.BAD_REQUEST);
    }

    const withdraw = await WithdrawModel.findByIdAndUpdate(
      id,
      { status, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!withdraw) {
      throw new customErrorAPI('Withdrawal not found', StatusCodes.NOT_FOUND);
    }

    res.status(StatusCodes.OK).json({
      success: true,
      message: `Withdrawal status updated to ${status}`,
      withdraw,
    });
  } catch (err) {
    next(err);
  }
});

// Delete a withdrawal
router.route('/withdraw/:id').delete(auth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const withdraw = await WithdrawModel.findByIdAndDelete(id);
    if (!withdraw) {
      throw new customErrorAPI('Withdrawal not found', StatusCodes.NOT_FOUND);
    }

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Withdrawal deleted successfully',
    });
  } catch (err) {
    next(err);
  }
});


module.exports = router