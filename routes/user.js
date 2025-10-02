const express=require('express')
const {createUser,transactionHistory,changePassword,loginUser,  submitIdentityVerification,
  getIdentityVerification,
  submitAddressVerification,
  getAddressVerification,
  getCurrentVerification,
  getAllPendingVerifications,
  updateVerificationStatus,getCurrencies,sendMoney,exchangeMoney,paymentRequest,deposit,giftCard,withdraw,applyLoan,fixedDeposit,dps,tickets,userVerifiedEmail,resendEmailVerification,verifyEmail,getUser,getPaymentRequest,getLoans, getFixedDeposit,getDpsSchemes,resetPassword,forgotpassword,updateUser, getTickets, getQuote, updateProfile, getTicketById, userReply, getRepliesForUser}=require('../controllers/user')
const auth=require('../middleware/auth')
const router=express.Router()
const upload = require('../middleware/multerUpload')
const requireAuth = require('../middleware/requireAuth')
const UserModel = require('../models/userModel')
const { StatusCodes } = require('http-status-codes')

router.get('/currencies', getCurrencies);
router.get('/quote', getQuote);
router.route('/create-user').post(createUser)
router.route('/login-user').post(loginUser)
router.route('/get-user').get(auth,getUser)
router.route('/transactions').get(requireAuth,transactionHistory)
router.route('/send-money').post(requireAuth,sendMoney)
router.route('/exchange-money').post(requireAuth,exchangeMoney)
router.route('/payment-request').post(requireAuth,paymentRequest)
router.route('/deposit').post(auth,upload.single('image'),deposit)
router.route('/redeem').post(auth,giftCard)
router.route('/withdraw').post(requireAuth,withdraw)
router.route('/loan').post(auth,upload.single('image'),applyLoan)
router.route('/loans').get(auth,getLoans)
router.route('/fixed-deposits').post(auth,upload.single('image'),fixedDeposit)
router.route('/get-fixed-deposits').get(auth,getFixedDeposit)
router.route('/dps').post(auth,dps)
router.route('/my-dps').get(auth,getDpsSchemes)
router.route('/get-payment-request').get(auth,getPaymentRequest)
router.route('/check-emailverified').get(auth,userVerifiedEmail)
router.route('/resend-eamil-verification').get(auth,resendEmailVerification)
router.route('/update').post(auth,upload.single('image'),updateUser)

router.route('/create-ticket').post(requireAuth,tickets)
router.route('/get-tickets').get(requireAuth,getTickets)
router.route('/forgot-password').post(forgotpassword)
router.route('/reset-password').post(auth,resetPassword)
router.route('/change-password').post(requireAuth,changePassword)
router.route('/verify-email').get(auth,verifyEmail)
router.route('/ticket/:id').get(requireAuth,getTicketById); // ticket + replies (server enforces ownership)
router.route('/ticket/:id/replies').get(requireAuth, getRepliesForUser);
router.route('/ticket/:id/reply').post(requireAuth, userReply); // user adds a reply
router.route('/profile').post(requireAuth,updateProfile)
router.route('/me').get(requireAuth,async(req,res)=>{
      // return only what you need; avoid sending secrets
      console.log("IN ME")
      const userId= req.user.sub
      const user=await UserModel.findById(userId)
      
              if(!user){
                  throw new customErrorAPI("No such user exists",StatusCodes.BAD_REQUEST)
              }
              console.log(user)
              res.status(StatusCodes.OK).json(user)

//   res.json({ userId: req.user.sub });
})






// File upload configuration
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/images/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'identity-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, and PDF files are allowed'), false);
  }
};

const uploads = multer({
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB limit
  },
  fileFilter: fileFilter
});

// User routes
router.route('/personal-id')
  .post(requireAuth, uploads.single('identity_file'), submitIdentityVerification)
  .get(requireAuth, getIdentityVerification);

router.route('/personal-id/current')
  .get(requireAuth, getCurrentVerification);

// // Admin routes
// router.route('/admin/pending-verifications')
//   .get(requireAuth, requireAdmin, getAllPendingVerifications);

// router.route('/admin/verification/:id')
//   .patch(requireAuth, requireAdmin, updateVerificationStatus);




// File upload configuration

// User routes
router.route('/personal-address')
  .post(requireAuth, upload.single('address_file'), submitAddressVerification)
  .get(requireAuth, getAddressVerification);



// Express example
// Example: session cookie named "sid"
// /api/user/auth/logout
router.get('/auth/logout', (req, res) => {
  const isProd = process.env.NODE_ENV === 'production';

  // Must MATCH how you set the cookie in loginUser
  const cookieOpts = {
    httpOnly: true,
    path: '/',
    sameSite: 'none',
    secure: true,
    // domain: '.yourdomain.com', // uncomment & set if you used a domain when setting the cookie
  };

  // Local same-origin DEV mode: match the fallback you used in login
  if (!isProd && (process.env.SAME_ORIGIN_DEV === '1')) {
    cookieOpts.sameSite = 'lax';
    cookieOpts.secure = false;
  }

  // Clear primary session cookie
  res.clearCookie('sid', cookieOpts);

  // (Optional) belt-and-suspenders clear in case attributes ever drift
  // res.clearCookie('sid', { httpOnly: true, path: '/' });

  // Prevent caches from keeping “logged-in” pages
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
    Pragma: 'no-cache',
  });

  // Optional redirect param support (e.g., /auth/logout?redirect=/login.html)
  const to = typeof req.query.redirect === 'string' ? req.query.redirect : '';
  if (to) return res.redirect(302, to);

  // If called via fetch(), this is perfect:
  return res.status(204).end();
});



module.exports=router

