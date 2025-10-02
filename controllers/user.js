const { StatusCodes } = require("http-status-codes")
const customErrorAPI =require("../customError/customError")
const UserModel = require("../models/userModel")
const axios =require('axios')
const nodemailer = require('nodemailer');
const SendMoneyModel = require("../models/sendMoneyModel");
const PaymentRequestModel = require("../models/paymentRequestModel");
const DepositModel = require("../models/depositModel");
const GiftCardModel = require("../models/giftcardModel");
const WithdrawModel = require("../models/withdraw");
const LoandModel = require("../models/loanModel");
const FixedDepositModel = require("../models/fixDeposit");
const DpsModel = require("../models/dpsScheme");
const TicketModel = require("../models/ticket");
const bycrypt=require('bcryptjs')
const validator=require('validator')
const cookieParser=require('cookie-parser')
const jwt=require('jsonwebtoken')
const IdentityVerification = require('../models/idVerification');



const path = require('path');
const fs = require('fs');

const Reply = require('../models/reply');
const createUser=async(req,res)=>{
    const {first_name,last_name,phone,email,password}=req.body

    const firstname=first_name;
    const lastname=last_name
    const phoneNumber=phone
    const data={firstname,lastname,phoneNumber,email,password}

    console.log(req.body)

    const userExist= await UserModel.findOne({email:email})

    if(!firstname||!lastname||!phoneNumber||!email||!password){
        throw new customErrorAPI("Enter all required fields ",StatusCodes.BAD_REQUEST)
    }


    if(userExist){
        throw new customErrorAPI("email already exits",StatusCodes.CONFLICT)
    }


       const createUser=await UserModel.create(data)
       const token=await createUser.signJWT()

      res.status(StatusCodes.OK).json({token:token})
   


    

      
    
    }
const updateProfile = async (req, res) => {
    try {
        const id = req.user.sub; // Extract user ID from the authenticated user
        const user = await UserModel.findById(id);
        
        if (!user) {
            return res.status(StatusCodes.NOT_FOUND).json({
                success: false,
                message: "User not found"
            });
        }

        const {
            firstName,
            lastName,
            phone,
            carrierCode,
            defaultCountry,
            address1,
            address2,
            city,
            state,
            country,
            timezone
        } = req.body;

        // Validation checks
        const errors = [];

        if (!firstName?.trim()) {
            errors.push("First name is required");
        }

        if (!lastName?.trim()) {
            errors.push("Last name is required");
        }

        if (!phone?.trim()) {
            errors.push("Phone number is required");
        }

        if (!carrierCode?.trim()) {
            errors.push("Carrier code is required");
        }

        if (!defaultCountry?.trim()) {
            errors.push("Default country is required");
        }

        if (errors.length > 0) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "Validation failed",
                errors: errors
            });
        }

        // Check if phone number already exists for another user
        if (phone) {
            const existingUser = await UserModel.findOne({
                phone: phone,
                _id: { $ne: id } // Exclude current user
            });
            
            if (existingUser) {
                return res.status(StatusCodes.BAD_REQUEST).json({
                    success: false,
                    message: "Phone number is already registered with another account"
                });
            }
        }

        // Prepare update data
        const updateData = {
            firstname: firstName.trim(),
            lastname: lastName.trim(),
            phone: phone.trim(),
            carrierCode: carrierCode.trim(),
            defaultCountry: defaultCountry.trim(),
            updatedAt: new Date()
        };

        // Optional fields
        if (address1) updateData.address1 = address1.trim();
        if (address2) updateData.address2 = address2.trim();
        if (city) updateData.city = city.trim();
        if (state) updateData.state = state.trim();
        if (country) updateData.country = country.trim();
        if (timezone) updateData.timezone = timezone.trim();

        // Update user profile
        const updatedUser = await UserModel.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true, runValidators: true }
        ).select('-password'); // Exclude password from response

        res.status(StatusCodes.OK).json({
            success: true,
            message: "Profile updated successfully",
            user: {
                id: updatedUser._id,
                firstname: updatedUser.firstname,
                lastname: updatedUser.lastname,
                email: updatedUser.email,
                phone: updatedUser.phone,
                carrierCode: updatedUser.carrierCode,
                defaultCountry: updatedUser.defaultCountry,
                address1: updatedUser.address1,
                address2: updatedUser.address2,
                city: updatedUser.city,
                state: updatedUser.state,
                country: updatedUser.country,
                timezone: updatedUser.timezone,
                createdAt: updatedUser.createdAt,
                updatedAt: updatedUser.updatedAt
            }
        });

    } catch (error) {
        console.error("Profile update error:", error);
        
        // Handle mongoose validation errors
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => err.message);
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "Validation failed",
                errors: validationErrors
            });
        }

        // Handle duplicate key errors
        if (error.code === 11000) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "Phone number or email already exists"
            });
        }

        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Internal server error"
        });
    }
};







const AddressVerification = require('../models/AddressVerification');


// ✅ Submit address verification
const submitAddressVerification = async (req, res, next) => {
  try {
    const userId = req.user?.sub;
    if (!userId) throw new customErrorAPI('Unauthorized', StatusCodes.UNAUTHORIZED);

    // Get user details
    const user = await UserModel.findById(userId);
    if (!user) throw new customErrorAPI('User does not exist', StatusCodes.CONFLICT);

    // Check if user already has a pending verification
    const existingPending = await AddressVerification.findOne({
      user: userId,
      status: 'pending'
    });

    if (existingPending) {
      throw new customErrorAPI('You already have a pending address verification', StatusCodes.CONFLICT);
    }

    // Validate file
    if (!req.file) {
      throw new customErrorAPI('Address proof file is required', StatusCodes.BAD_REQUEST);
    }

    // Validate file type
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      fs.unlinkSync(req.file.path);
      throw new customErrorAPI('Only JPEG, PNG, and PDF files are allowed', StatusCodes.BAD_REQUEST);
    }

    // Validate file size (2MB max)
    if (req.file.size > 2 * 1024 * 1024) {
      fs.unlinkSync(req.file.path);
      throw new customErrorAPI('File size must be less than 2MB', StatusCodes.BAD_REQUEST);
    }

    // Create address verification record
    const addressVerification = await AddressVerification.create({
      user: userId,
      userEmail: user.email,
      address_file: req.file.filename
    });

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Address verification submitted successfully',
      data: {
        id: addressVerification._id,
        status: addressVerification.status,
        submitted_at: addressVerification.submitted_at
      }
    });

  } catch (err) {
    // Clean up uploaded file if error occurs
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(err);
  }
};

// ✅ Get user's address verification status
const getAddressVerification = async (req, res, next) => {
  try {
    const userId = req.user?.sub;
    if (!userId) throw new customErrorAPI('Unauthorized', StatusCodes.UNAUTHORIZED);

    const user = await User.findById(userId);
    if (!user) throw new customErrorAPI('User does not exist', StatusCodes.CONFLICT);

    // Get all address verifications for this user, sorted by latest first
    const verifications = await AddressVerification.find({ userEmail: user.email })
      .sort({ createdAt: -1 })
      .select('-__v');

    res.status(StatusCodes.OK).json({
      success: true,
      data: verifications
    });

  } catch (err) {
    next(err);
  }
};



//     const getCurrencies=async(req,res)=>{
//     const url=`https://v6.exchangerate-api.com/v6/${process.env.EXCHANGE_RATE_API}/latest/USD`
//        const currencies=await axios.get(url)
      
     
// //        const currencyEntries=Object.entries(currencies.data.conversion_rates)

// //        // Map over the entries to create the array of objects
// // const currencyArray = currencyEntries.map(([key, value]) => ({
// //     currency: key,
// //     value: value
// //   }));
  
     
    
//        res.status(StatusCodes.OK).json(currencies.data.conversion_rates)
    
//     }

// controllers/exchange.controller.js


const EX_API_KEY = process.env.EXCHANGE_RATE_API; // v6 exchangerate-api.com key
const EX_BASE = 'USD';                             // API call will use USD base
const FEES_PERCENTAGE = Number(process.env.EX_FEES_PERCENTAGE ?? 0.5); // %
const FEES_FIXED = Number(process.env.EX_FEES_FIXED ?? 1.0);           // flat fee in "to" currency
const CACHE_TTL_MS = Number(process.env.EX_RATES_TTL_MS ?? 5 * 60 * 1000); // 5 min

let ratesCache = {
  data: null,       // { conversion_rates: { USD:1, EUR:0.92, ... } }
  fetchedAt: 0
};

async function fetchRates() {
  const now = Date.now();
  if (ratesCache.data && now - ratesCache.fetchedAt < CACHE_TTL_MS) {
    return ratesCache.data;
  }
  const url = `https://v6.exchangerate-api.com/v6/${EX_API_KEY}/latest/${EX_BASE}`;
  const { data } = await axios.get(url);
  if (!data || !data.conversion_rates) {
    const err = new Error('Invalid response from exchange provider');
    err.status = StatusCodes.BAD_GATEWAY;
    throw err;
  }
  ratesCache = { data, fetchedAt: now };
  return data;
}

/**
 * GET /api/exchange/currencies
 * Returns the raw conversion_rates map from ExchangeRate-API (base = USD by default)
 */
const getCurrencies = async (req, res, next) => {
  try {
    const { conversion_rates } = await fetchRates();
    // send just the map: { USD:1, EUR:0.92, ... }
    res.status(StatusCodes.OK).json(conversion_rates);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/exchange/quote?from=USD&to=EUR&amount=123.45
 * Computes cross rate (to/from) using the USD-based table, then applies fees.
 * Fees:
 *  - percentage applied to converted amount
 *  - fixed fee expressed in the "to" currency
 * Response:
 * {
 *   rate,                // cross rate (from -> to)
 *   feesPercentage,      // %
 *   feesFixed,           // in "to" currency
 *   totalFees,           // in "to" currency
 *   finalAmount          // converted - fees, in "to" currency
 * }
 */
const getQuote = async (req, res, next) => {
  try {
    const from = String(req.query.from || '').toUpperCase();
    const to   = String(req.query.to || '').toUpperCase();
    const amount = Number(req.query.amount);

    if (!from || !to) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: 'from and to are required' });
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: 'amount must be a positive number' });
    }
    if (from === to) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: 'from and to must be different' });
    }

    const { conversion_rates: rates } = await fetchRates();

    if (!(from in rates) || !(to in rates)) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: 'Unsupported currency code' });
    }

    // Cross rate via USD base: USD->TO / USD->FROM
    const crossRate = Number(rates[to]) / Number(rates[from]);

    const converted = amount * crossRate; // in "to" currency
    const pctFee = (converted * FEES_PERCENTAGE) / 100;
    const totalFees = pctFee + FEES_FIXED;
    const finalAmount = Math.max(0, converted - totalFees);

    res.status(StatusCodes.OK).json({
      rate: round4(crossRate),
      feesPercentage: FEES_PERCENTAGE,
      feesFixed: round2(FEES_FIXED),
      totalFees: round2(totalFees),
      finalAmount: round2(finalAmount)
    });
  } catch (err) {
    next(err);
  }
};

function round2(x) { return Math.round((Number(x) + Number.EPSILON) * 100) / 100; }
function round4(x) { return Math.round((Number(x) + Number.EPSILON) * 10000) / 10000; }




    // const loginUser=async(req,res)=>{

    //     const {email,accountNumber,password}=req.body
    //     const user= await UserModel.findOne( {$or:[
    //       {email:email},
    //       {accountNumber:email},
         
    //   ]})

    //     if(!user){
    //         throw new customErrorAPI("No such user Exists",StatusCodes.CONFLICT)
    //     }

    //     const isMatch= await user.verifyPassword(password)
    //     if(!isMatch){
    //         throw new customErrorAPI("Wrong Password",StatusCodes.BAD_REQUEST)
            
    //     }
    //     const token=await user.signJWT()
    //         res.status(StatusCodes.OK).json({token:token})
    // }

const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await UserModel.findOne({ email });
    if (!user) return res.status(404).json({ message: 'Invalid credentials' });

    const ok = await user.verifyPassword(password);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    // issue short-lived JWT
    const token = jwt.sign(
      { sub: String(user._id),email:String(user.email) },
      process.env.JWT_SECRET,
      { expiresIn: '30m' }
    );

    // -------- Cookie settings --------
    const isProd = process.env.NODE_ENV === 'production';
    // If your frontend is on a different origin (127.0.0.1:5500 vs localhost:5000),
    // you need cross-site cookies:
    const cookieOpts = {
      httpOnly: true,
      path: '/',
      maxAge: 30 * 60 * 1000, // 30m
      sameSite: 'none',       // 👈 required for cross-site
      secure: true,           // 👈 required when sameSite is 'none'
      // domain: '.yourdomain.com', // 👈 set this in PROD if API and FE are on subdomains
    };

    // In pure local DEV, if you’re NOT using HTTPS and serving both from the same host,
    // you can fall back to lax+insecure to make local tests easy:
    if (!isProd && (process.env.SAME_ORIGIN_DEV === '1')) {
      cookieOpts.sameSite = 'lax';
      cookieOpts.secure = false;
    }

    res.cookie('sid', token, cookieOpts);

    // prevent caches from storing auth responses
    res.set('Cache-Control', 'no-store');

    // your front-end can do: if (redirect) location = redirect;
    return res.status(200).json({ redirect: '/dashboard.html' });
  } catch (err) {
    next(err);
  }
};

const sendMoney = async (req, res) => {
    const id = req.user.sub; // Extract user ID from the authenticated user

    console.log(req.body);

    const { recipientEmail, currency, amount, note } = req.body;

    // Validate required fields
    if (!recipientEmail || !currency || !amount) {
        throw new customErrorAPI("Enter all required fields", StatusCodes.BAD_REQUEST);
    }

    // Find the user who is sending money
    const user = await UserModel.findById(id);
    if (!user) {
        throw new customErrorAPI("No such user exists", StatusCodes.BAD_REQUEST);
    }

    // Get the user's balance for the selected currency
    let balance;
    if (currency === 'USD') {
        balance = user.balance.USD;
    }
    if (currency === 'EUR') {
        balance = user.balance.EUR;
    }
    if (currency === 'GBP') {
        balance = user.balance.GBP;
    }

    console.log(balance);

    // Check if the user has sufficient funds
    if (amount > balance) {
        throw new customErrorAPI("Insufficient funds", StatusCodes.CONFLICT);
    }

    // Find the recipient by email (since we're using email for identification)
    const recipient = await UserModel.findOne({ email: recipientEmail });

    if (!recipient) {
        throw new customErrorAPI("No such user account exists, check email and try again", StatusCodes.NOT_FOUND);
    }

    // Create a payment transaction
    const sendMoney = await SendMoneyModel.create({
        senderId: id,
        recipientEmail: recipientEmail,
        currency: currency,
        amount: amount,
        note: note,
    });

    // Update the sender's balance after the transaction
    const updateSenderBalance = await UserModel.findOneAndUpdate(
        { _id: id },
        {
            $inc: {
                [`balance.${currency}`]: -amount, // Decrease the sender's balance by the amount sent
            },
        },
        { new: true }
    );

    // Update the recipient's balance after receiving the funds
    const updateRecipientBalance = await UserModel.findOneAndUpdate(
        { email: recipientEmail },
        {
            $inc: {
                [`balance.${currency}`]: amount, // Increase the recipient's balance by the amount received
            },
        },
        { new: true }
    );

    // Return the response
    res.status(StatusCodes.OK).json({ sendMoney, updatedSenderBalance: updateSenderBalance, updatedRecipientBalance: updateRecipientBalance });
};



    const exchangeMoney=async(req,res)=>{

        const id= req.user.sub
        const {toCurrency,fromCurrency,amount,final_amount}=req.body
         console.log(req.body)
        const user=await UserModel.findById(id)

        if(!user){
            throw new customErrorAPI("No such user exists",StatusCodes.BAD_REQUEST)
        }
        const balance=user.balance[fromCurrency]

        console.log(balance)

        if(amount>balance){
            throw new customErrorAPI("insufficient Funds",StatusCodes.CONFLICT)
        }

        const updateBalance = await UserModel.findOneAndUpdate(
            { _id: id },
            {
              $inc: { 
                [`balance.${fromCurrency}`]: -amount, 
                [`balance.${toCurrency}`]: final_amount 
              }
            },
            { new: true }
          );



          res.status(StatusCodes.OK).json(updateBalance)
        
    }

const paymentRequest = async (req, res) => {
    const id = req.user.sub; // Extract user ID from the authenticated user

    // Find the user based on the authenticated user ID
    const user = await UserModel.findById(id);
    if (!user) {
        throw new customErrorAPI("No such user exists", StatusCodes.BAD_REQUEST);
    }

    // Extract data from the request body
    const { recipientEmail, currency, amount, note } = req.body;

    // Validate required fields
    if (!recipientEmail || !currency || !amount) {
        throw new customErrorAPI("Enter all required fields", StatusCodes.BAD_REQUEST);
    }

    // Find the recipient user by email
    const recipient = await UserModel.findOne({ email: recipientEmail });
    if (!recipient) {
        throw new customErrorAPI("No such user account exists, check email and try again", StatusCodes.NOT_FOUND);
    }

    // Create the payment request
    const paymentRequest = await PaymentRequestModel.create({
        senderEmail: user.email,
        recipientEmail: recipientEmail,
        currency: currency,
        amount: amount,
        note: note,
    });

    // Return the response
    res.status(StatusCodes.OK).json({ paymentRequest });
};



    const getPaymentRequest=async(req,res)=>{
        const {id}=req.user
        const user=await UserModel.findById(id)

        if(!user){
            throw new customErrorAPI("No such user exists",StatusCodes.BAD_REQUEST)
        }

     let getRequests=await PaymentRequestModel.find({
            $or:[
                {receiverAccount:user.email},
                {receiverAccount:user.accountNumber},
                {userEmail:user.email}
            ]
        })

        let modifiedrequest=[];

        for(i=0;i<getRequests.length;i++){
           if(getRequests[i].userEmail==user.email){
            modifiedrequest.push({
                ...getRequests[i]._doc,
                isUser:true
                
            })
           }else{
            modifiedrequest.push({
                ...getRequests[i]._doc,
                isUser:false
                
            })
           }

        }

        console.log(modifiedrequest)

        res.status(StatusCodes.OK).json(modifiedrequest)

    }





    const deposit=async(req,res)=>{
        const {id}=req.user
        console.log(req.file)
        console.log(req.body)
        const user=await UserModel.findById(id)
        function generateRandomID(prefix = '', length = 10) {
          const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
          let result = prefix;
          for (let i = 0; i < length; i++) {
              const randomIndex = Math.floor(Math.random() * characters.length);
              result += characters.charAt(randomIndex);
          }
      
          return result;
      }
      
      // Generate random transaction ID and invoice ID
      const transactionID = generateRandomID('TX-', 12); // e.g., TX-1A2B3C4D5E6F
    
      
      console.log('Transaction ID:', transactionID);
      // console.log('Invoice ID:', invoiceID);
      

        if(!user){
            throw new customErrorAPI("No such user exists",StatusCodes.BAD_REQUEST)
        }
  
        const {amount,method,note,currency}=req.body
        if(!amount||!method||!currency){
            throw new customErrorAPI("Enter all required fields",StatusCodes.BAD_REQUEST)
        }

       

        // if(method=='USDT (TRC20)'||method=='Bitcoin'){
        //     if(!req.file){
        //         throw new customErrorAPI("Upload Proof of Identity",StatusCodes.BAD_REQUEST)

        //     }
           
        // }

        // const fileName=req?.file?.filename
        const deposit=await DepositModel.create({amount:amount,method:method,userEmail:user.email,note:note,currency:currency,trx:transactionID})
        const transporter = nodemailer.createTransport({
            host: 'smtp.hostinger.com', // e.g., smtp.hostinger.com for Gmail
            port: 465, // or 465 for secure connection
            secure: true, // true for 465, false for other ports
            auth: {
                user: process.env.ADMIN_EMAIL, // your email
                pass: process.env.EMAIL_PASS, // your email password
            },
             tls: {
    // 👇 THIS is what fixes the self-signed cert issue
    rejectUnauthorized: false
  }
        });
       const message={
        from: {
          name: `${process.env.SITE_NAME}`,
          address: `${process.env.ADMIN_EMAIL}`
        },
        to:`${user.email},${process.env.ADMIN_EMAIL}`,
        subject:'New Deposit',
        html:`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="x-ua-compatible" content="ie=edge">
  <title>Deposit Request Confirmation</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style type="text/css">
    /* Google webfonts */
    @media screen {
      @font-face {
        font-family: 'Source Sans Pro';
        font-style: normal;
        font-weight: 400;
        src: local('Source Sans Pro Regular'), local('SourceSansPro-Regular'), url(https://fonts.gstatic.com/s/sourcesanspro/v10/ODelI1aHBYDBqgeIAH2zlBM0YzuT7MdOe03otPbuUS0.woff) format('woff');
      }
      @font-face {
        font-family: 'Source Sans Pro';
        font-style: normal;
        font-weight: 700;
        src: local('Source Sans Pro Bold'), local('SourceSansPro-Bold'), url(https://fonts.gstatic.com/s/sourcesanspro/v10/toadOcfmlt9b38dHJxOBGFkQc6VGVFSmCnC_l7QZG60.woff) format('woff');
      }
    }
    body, table, td, a {
      -ms-text-size-adjust: 100%;
      -webkit-text-size-adjust: 100%;
    }
    table, td {
      mso-table-rspace: 0pt;
      mso-table-lspace: 0pt;
    }
    img {
      -ms-interpolation-mode: bicubic;
    }
    a[x-apple-data-detectors] {
      font-family: inherit !important;
      font-size: inherit !important;
      font-weight: inherit !important;
      line-height: inherit !important;
      color: inherit !important;
      text-decoration: none !important;
    }
    div[style*="margin: 16px 0;"] {
      margin: 0 !important;
    }
    body {
      width: 100% !important;
      height: 100% !important;
      padding: 0 !important;
      margin: 0 !important;
    }
    table {
      border-collapse: collapse !important;
    }
    a {
      color: #1a82e2;
    }
    img {
      height: auto;
      line-height: 100%;
      text-decoration: none;
      border: 0;
      outline: none;
    }
  </style>
</head>
<body style="background-color: #e9ecef;">

  <div class="preheader" style="display: none; max-width: 0; max-height: 0; overflow: hidden; font-size: 1px; line-height: 1px; color: #fff; opacity: 0;">
    Your deposit request has been submitted successfully.
  </div>

  <table border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td align="center" bgcolor="#e9ecef">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
          <tr>
            <td align="center" valign="top" style="padding: 36px 24px;">
              <a href="https://www.blogdesire.com" target="_blank" style="display: inline-block;">
                <img src="https://www.blogdesire.com/wp-content/uploads/2019/07/blogdesire-1.png" alt="Logo" border="0" width="48" style="display: block; width: 48px; max-width: 48px; min-width: 48px;">
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <tr>
      <td align="center" bgcolor="#e9ecef">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
          <tr>
            <td align="left" bgcolor="#ffffff" style="padding: 36px 24px 0; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; border-top: 3px solid #d4dadf;">
              <h1 style="margin: 0; font-size: 32px; font-weight: 700; letter-spacing: -1px; line-height: 48px;">Deposit Request Confirmation</h1>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <tr>
      <td align="center" bgcolor="#e9ecef">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">

          <tr>
            <td align="left" bgcolor="#ffffff" style="padding: 24px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 16px; line-height: 24px;">
              <p style="margin: 0;">New deposit request of <strong>${amount}  ${currency}</strong> via <strong> ${method}</strong> has been submitted successfully.</p>
              <h3 style="margin-top: 24px;">Details of your Deposit:</h3>
              <p style="margin: 0;">Amount: <strong> ${amount} ${currency}</strong><br>
                 Charge: <strong>0  ${currency}</strong><br>
                 Payable: <strong{${amount} ${currency}</strong><br>
                 Paid via: <strong>${method}</strong><br>
                 Transaction Number: <strong>${transactionID}</strong></p>
            </td>
          </tr>

          <tr>
            <td align="left" bgcolor="#ffffff" style="padding: 24px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 16px; line-height: 24px; border-bottom: 3px solid #d4dadf;">
              <p style="margin: 0;">Cheers,<br> ${process.env.SITE_NAME}</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>

    <tr>
      <td align="center" bgcolor="#e9ecef" style="padding: 24px;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">

          <tr>
            <td align="center" bgcolor="#e9ecef" style="padding: 12px 24px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 20px; color: #666;">
              <p style="margin: 0;">You received this email because we received a request for a deposit. If you didn't make this request, you can safely delete this email.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`

      }
      transporter.sendMail(message,(error, info)=>{
        if(error){
          console.log(error)
        
        }else{
          console.log('success' + info )
        
        }
  
      })


        res.status(StatusCodes.OK).json(deposit)

    }

    const giftCard=async(req,res)=>{
        const {id}=req.user
        const user=await UserModel.findById(id)

        if(!user){
            throw new customErrorAPI("No such user exists",StatusCodes.BAD_REQUEST)
        }
        const {code}=req.body

        if(!code){
            throw new customErrorAPI("Enter Gift Card Code",StatusCodes.BAD_REQUEST)
        }

        const createGiftCard=await GiftCardModel.create({userEmail:user.email,code:code})

        res.status(StatusCodes.OK).json(createGiftCard)

    }




    const withdraw=async(req,res)=>{

        const id = req.user?.sub;
        const user=await UserModel.findById(id)
        
        if(!user){
            throw new customErrorAPI("No such user exists",StatusCodes.BAD_REQUEST)
        }
        

    console.log(req.body)
        const {paymentSettingId,currencyId,amount}=req.body

        const method=await WithdrawalSetting.findById(paymentSettingId);
        const currency=currencyId;
        
         const balance=user.balance[currency]

       

        if(!amount||!method||!amount){
            throw new customErrorAPI("Enter all required fields",StatusCodes.BAD_REQUEST)
        }


        if(amount>balance){
            throw new customErrorAPI("insufficient Funds",StatusCodes.CONFLICT)
        }
        function generateRandomID(prefix = '', length = 10) {
          const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
          let result = prefix;
      
          for (let i = 0; i < length; i++) {
              const randomIndex = Math.floor(Math.random() * characters.length);
              result += characters.charAt(randomIndex);
          }
      
          return result;
      }
      
      // Generate random transaction ID and invoice ID
      const transactionID = generateRandomID('TX-', 12); // e.g., TX-1A2B3C4D5E6F
      console.log('Transaction ID:', transactionID);

      const withdraw=await WithdrawModel.create({amount:amount,method:method,currency:currency,userEmail:user.email,trx:transactionID})

      const updateBalance = await UserModel.findOneAndUpdate(
            { _id: id },
            {
              $inc: { 
                [`balance.${currency}`]: -amount
              }
            },
            { new: true }
          );


      res.status(StatusCodes.OK).json(withdraw)


    }

  const transactionHistory=async(req,res)=>{
       const id = req.user.sub; 
const user = await UserModel.findById(id);
if (!user) {
  throw new customErrorAPI("No such user exists", StatusCodes.BAD_REQUEST);
}

const [deposit, withdrawal, giftcard] = await Promise.all([
  DepositModel.find({ userEmail: user.email }),
  GiftCardModel.find({ userEmail: user.email }),
  WithdrawModel.find({ userEmail: user.email })
]);

// Add the user object to each transaction
const depositWithUser = deposit.map(transaction => ({
  ...transaction.toObject(),
  ...user.toObject()
}));

const giftcardWithUser = giftcard.map(transaction => ({
  ...transaction.toObject(),
  ...user.toObject()
}));

const withdrawalWithUser = withdrawal.map(transaction => ({
  ...transaction.toObject(),
  ...user.toObject()
}));

// Combine all transactions
const transactions = [
  ...depositWithUser,
  ...giftcardWithUser,
  ...withdrawalWithUser
];


      res.status(200).json(transactions)

    }


    const applyLoan=async(req,res)=>{

        const {id}=req.user
        const user=await UserModel.findById(id)
        let  totalPayableAmount;
        let interestRate;

        if(!user){
            throw new customErrorAPI("No such user exists",StatusCodes.BAD_REQUEST)
        }

        const {loanProduct,currency,firstPaymentDate,amount,note}=req.body
         console.log(req.body)


        if(!loanProduct||!currency||!firstPaymentDate||!amount){
            throw new customErrorAPI("Enter all required fields",StatusCodes.BAD_REQUEST)
        }

        if(loanProduct=='Student Loan'){
            interestRate = 0.05;
            totalPayableAmount =Number(amount) + (amount * interestRate);
            console.log(totalPayableAmount)

        }
        if(loanProduct=='Business Loan'){
            interestRate = 0.10; 
            totalPayableAmount =Number(amount) + (amount * interestRate);
            console.log(totalPayableAmount)

        }
        if(loanProduct=='Enterprise Loan'){
            interestRate = 0.07; 
            totalPayableAmount =Number(amount) + (amount * interestRate);
           console.log(totalPayableAmount)

        }

    console.log(req.file)
        if(!req.file){
            throw new customErrorAPI("Upload Proof of Identity",StatusCodes.BAD_REQUEST)
        }

        const fileName=req?.file?.filename
        const loan=await LoandModel.create({loanProduct:loanProduct,currency:currency,firstPaymentDate:firstPaymentDate,amount:amount,note:note,img:fileName,userEmail:user.email,totalpayableAmount:totalPayableAmount,dueAmount:totalPayableAmount})

        res.status(StatusCodes.OK).json(loan)

    }
    const getLoans=async(req,res)=>{
        const {id}=req.user
        const user=await UserModel.findById(id)

        if(!user){
            throw new customErrorAPI("No such user exists",StatusCodes.BAD_REQUEST)
        }

       const getLoans=await LoandModel.find({
                userEmail:user.email
            
        })



        res.status(StatusCodes.OK).json(getLoans)

    }

    const fixedDeposit=async(req,res)=>{
        const {id}=req.user
        const user=await UserModel.findById(id)

        if(!user){
            throw new customErrorAPI("No such user exists",StatusCodes.BAD_REQUEST)
        }
   console.log(req.body)
        const {tenure,currency,amount,note,returnAmount,matureDate}=req.body

        if(!tenure||!currency||!amount||!returnAmount||!matureDate){
            throw new customErrorAPI("Enter all required fields",StatusCodes.BAD_REQUEST)
        }

        if(!req.file){
            throw new customErrorAPI("Upload Proof of Identity",StatusCodes.BAD_REQUEST)
        }

        const fileName=req?.file?.filename


        const fixedDeposit=await FixedDepositModel.create({tenure:tenure,currency:currency,img:fileName,userEmail:user.email,note:note,returnAmount:returnAmount,matureDate,amount:amount
        })


        res.status(StatusCodes.OK).json(fixedDeposit)

    }

    const getFixedDeposit=async(req,res)=>{
        const {id}=req.user
        const user=await UserModel.findById(id)

        if(!user){
            throw new customErrorAPI("No such user exists",StatusCodes.BAD_REQUEST)
        }

       const getFDR=await FixedDepositModel.find({
                userEmail:user.email
            
        })



        res.status(StatusCodes.OK).json(getFDR)

    }

    const dps = async (req, res) => {
        const { id } = req.user;
        const user = await UserModel.findById(id);
    
        if (!user) {
            throw new customErrorAPI("No such user exists", StatusCodes.BAD_REQUEST);
        }
    
        const { plan, perInstallment, nextInstallment, totalPayableAmount, totalPaid, maturedAmount, interestRate,installmentInterval,totalInstallments,totalDeposit,currency} = req.body;
    
        if (!plan) {
            throw new customErrorAPI("Select a plan", StatusCodes.BAD_REQUEST);
        }
    
        const dpsScheme = await DpsModel.create({
            plan: plan,
            userEmail: user.email,
            interestRate:interestRate,
            installmentInterval:installmentInterval,
            perInstallment: perInstallment,
            totalPayableAmount: totalInstallments,
            maturedAmount: maturedAmount,
            totalDeposit:totalDeposit,
            currency:currency
        });
    
        res.status(StatusCodes.OK).json(dpsScheme);
    };
    
    const getDpsSchemes = async (req, res) => {
        console.log(req.user)
        const { id } = req.user;
        const user = await UserModel.findById(id);
    
        if (!user) {
            throw new customErrorAPI("No such user exists", StatusCodes.BAD_REQUEST);
        }
    
        const dpsSchemes = await DpsModel.find({ userEmail: user.email });
    
        if (dpsSchemes.length === 0) {
            return res.status(StatusCodes.OK).json({ message: "No DPS schemes found" });
        }
    
        res.status(StatusCodes.OK).json(dpsSchemes);
    };
    

const tickets = async (req, res, next) => {
  try {
    // ✅ use one source of truth for user id
    const userId = req.user?.sub;
    if (!userId) throw new customErrorAPI('Unauthorized', StatusCodes.UNAUTHORIZED);

    const user = await UserModel.findById(userId);
    if (!user) throw new customErrorAPI('No such user exists', StatusCodes.BAD_REQUEST);

    const { subject, priority, note } = req.body || {};
    if (!subject || !note || !priority) {
      throw new customErrorAPI('Enter all required fields', StatusCodes.BAD_REQUEST);
    }

    const fileName = req?.file?.filename || null;

    // ✅ create the ticket first
    const ticket = await TicketModel.create({
      subject,
      userId:user._id,
      message: note,           // if your schema has 'message' as initial content
      img: fileName,           // optional attachment filename
      userEmail: user.email,
      priority
    });

    // ✅ send email (fire-and-forget; errors logged but don’t break API)
    (async () => {
      try {
        const transporter = nodemailer.createTransport({
          host: 'smtp.hostinger.com',
          port: 465,
          secure: true,
          auth: {
            user: process.env.ADMIN_EMAIL,
            pass: process.env.EMAIL_PASS,
          },
          tls: { rejectUnauthorized: false },
        });

        const message = {
          from: { name: `${process.env.SITE_NAME}`, address: `${process.env.ADMIN_EMAIL}` },
          to: user.email,
          subject: 'New Ticket',
          html: `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Ticket Notification</title>
<style>body{font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:20px}.container{background:#fff;padding:20px;border-radius:5px;box-shadow:0 2px 4px rgba(0,0,0,.1)}.header{background:#007bff;color:#fff;padding:10px;text-align:center;border-radius:5px 5px 0 0}.content{margin:20px 0}.content p{margin:10px 0;line-height:1.6}.footer{font-size:12px;color:#666;text-align:center;margin-top:20px}</style>
</head><body><div class="container"><div class="header"><h2>New Ticket Notification</h2></div>
<div class="content">
<p><strong>Subject:</strong> ${subject}</p>
<p><strong>Message:</strong> ${note}</p>
<p><strong>Email:</strong> ${user.email}</p>
</div><div class="footer"><p>This is an automated message. Please do not reply.</p></div></div></body></html>`
        };

        await transporter.sendMail(message);
      } catch (e) {
        console.error('Ticket email failed:', e?.message || e);
      }
    })();

    return res.status(StatusCodes.CREATED).json({ success: true, ticket });
  } catch (err) {
    next(err);
  }
};

// GET /api/tickets/mine
const getTickets = async (req, res, next) => {
  try {
    // ✅ keep consistency with req.user.sub
    const userId = req.user?.sub;
    if (!userId) throw new customErrorAPI('Unauthorized', StatusCodes.UNAUTHORIZED);

    const user = await UserModel.findById(userId);
    if (!user) throw new customErrorAPI('User does not exist', StatusCodes.CONFLICT);

    // You were filtering by email — keep that (works even if user changes _id).
    const userTickets = await TicketModel.find({ userEmail: user.email })
      .sort({ createdAt: -1 });

    return res.status(StatusCodes.OK).json({ success: true, tickets: userTickets });
  } catch (err) {
    next(err);
  }
};


    const userVerifiedEmail=async(req,res)=>{
        const {id}=req.user
        const user=await UserModel.findById(id)

        if(!user){
            throw new customErrorAPI("No such user exists",StatusCodes.BAD_REQUEST)
        }

        res.status(StatusCodes.OK).json(user)
    }


    const resendEmailVerification=async(req,res)=>{
        const {id}=req.user
  
        const user=await UserModel.findById(id)

        const token=await user.signJWT()
        const transporter = nodemailer.createTransport({
            host: 'smtp.hostinger.com', // e.g., smtp.hostinger.com for Gmail
            port: 465, // or 465 for secure connection
            secure: true, // true for 465, false for other ports
            auth: {
                user: process.env.ADMIN_EMAIL, // your email
                pass: process.env.EMAIL_PASS, // your email password
            },
             tls: {
    // 👇 THIS is what fixes the self-signed cert issue
    rejectUnauthorized: false
  }
        });
       const message={
        from: {
          name: `${process.env.SITE_NAME}`,
          address: `${process.env.ADMIN_EMAIL}`
        },
        to:user.email,
        subject:'Email Confirmation',
        html:`<!DOCTYPE html>
<html>
<head>

  <meta charset="utf-8">
  <meta http-equiv="x-ua-compatible" content="ie=edge">
  <title>Email Confirmation</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style type="text/css">
  /**
   * Google webfonts. Recommended to include the .woff version for cross-client compatibility.
   */
  @media screen {
    @font-face {
      font-family: 'Source Sans Pro';
      font-style: normal;
      font-weight: 400;
      src: local('Source Sans Pro Regular'), local('SourceSansPro-Regular'), url(https://fonts.gstatic.com/s/sourcesanspro/v10/ODelI1aHBYDBqgeIAH2zlBM0YzuT7MdOe03otPbuUS0.woff) format('woff');
    }
    @font-face {
      font-family: 'Source Sans Pro';
      font-style: normal;
      font-weight: 700;
      src: local('Source Sans Pro Bold'), local('SourceSansPro-Bold'), url(https://fonts.gstatic.com/s/sourcesanspro/v10/toadOcfmlt9b38dHJxOBGFkQc6VGVFSmCnC_l7QZG60.woff) format('woff');
    }
  }
  /**
   * Avoid browser level font resizing.
   * 1. Windows Mobile
   * 2. iOS / OSX
   */
  body,
  table,
  td,
  a {
    -ms-text-size-adjust: 100%; /* 1 */
    -webkit-text-size-adjust: 100%; /* 2 */
  }
  /**
   * Remove extra space added to tables and cells in Outlook.
   */
  table,
  td {
    mso-table-rspace: 0pt;
    mso-table-lspace: 0pt;
  }
  /**
   * Better fluid images in Internet Explorer.
   */
  img {
    -ms-interpolation-mode: bicubic;
  }
  /**
   * Remove blue links for iOS devices.
   */
  a[x-apple-data-detectors] {
    font-family: inherit !important;
    font-size: inherit !important;
    font-weight: inherit !important;
    line-height: inherit !important;
    color: inherit !important;
    text-decoration: none !important;
  }
  /**
   * Fix centering issues in Android 4.4.
   */
  div[style*="margin: 16px 0;"] {
    margin: 0 !important;
  }
  body {
    width: 100% !important;
    height: 100% !important;
    padding: 0 !important;
    margin: 0 !important;
  }
  /**
   * Collapse table borders to avoid space between cells.
   */
  table {
    border-collapse: collapse !important;
  }
  a {
    color: #1a82e2;
  }
  img {
    height: auto;
    line-height: 100%;
    text-decoration: none;
    border: 0;
    outline: none;
  }
  </style>

</head>
<body style="background-color: #e9ecef;">

  <!-- start preheader -->
  <div class="preheader" style="display: none; max-width: 0; max-height: 0; overflow: hidden; font-size: 1px; line-height: 1px; color: #fff; opacity: 0;">
    A preheader is the short summary text that follows the subject line when an email is viewed in the inbox.
  </div>
  <!-- end preheader -->

  <!-- start body -->
  <table border="0" cellpadding="0" cellspacing="0" width="100%">

    <!-- start logo -->
    <tr>
      <td align="center" bgcolor="#e9ecef">
        <!--[if (gte mso 9)|(IE)]>
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="600">
        <tr>
        <td align="center" valign="top" width="600">
        <![endif]-->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
          <tr>
            <td align="center" valign="top" style="padding: 36px 24px;">
              <a href="https://www.blogdesire.com" target="_blank" style="display: inline-block;">
                <img src="https://www.blogdesire.com/wp-content/uploads/2019/07/blogdesire-1.png" alt="Logo" border="0" width="48" style="display: block; width: 48px; max-width: 48px; min-width: 48px;">
              </a>
            </td>
          </tr>
        </table>
        <!--[if (gte mso 9)|(IE)]>
        </td>
        </tr>
        </table>
        <![endif]-->
      </td>
    </tr>
    <!-- end logo -->

    <!-- start hero -->
    <tr>
      <td align="center" bgcolor="#e9ecef">
        <!--[if (gte mso 9)|(IE)]>
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="600">
        <tr>
        <td align="center" valign="top" width="600">
        <![endif]-->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
          <tr>
            <td align="left" bgcolor="#ffffff" style="padding: 36px 24px 0; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; border-top: 3px solid #d4dadf;">
              <h1 style="margin: 0; font-size: 32px; font-weight: 700; letter-spacing: -1px; line-height: 48px;">Confirm Your Email Address</h1>
            </td>
          </tr>
        </table>
        <!--[if (gte mso 9)|(IE)]>
        </td>
        </tr>
        </table>
        <![endif]-->
      </td>
    </tr>
    <!-- end hero -->

    <!-- start copy block -->
    <tr>
      <td align="center" bgcolor="#e9ecef">
        <!--[if (gte mso 9)|(IE)]>
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="600">
        <tr>
        <td align="center" valign="top" width="600">
        <![endif]-->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">

          <!-- start copy -->
          <tr>
            <td align="left" bgcolor="#ffffff" style="padding: 24px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 16px; line-height: 24px;">
              <p style="margin: 0;">Tap the button below to confirm your email address. If you didn't create an account with <a href=${process.env.SITE_URL}>${process.env.SITE_NAME}</a>, you can safely delete this email.</p>
            </td>
          </tr>
          <!-- end copy -->

          <!-- start button -->
          <tr>
            <td align="left" bgcolor="#ffffff">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" bgcolor="#ffffff" style="padding: 12px;">
                    <table border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" bgcolor="#1a82e2" style="border-radius: 6px;">
                          <a href="${process.env.SITE_URL}/verify-email?token=${token} target="_blank" style="display: inline-block; padding: 16px 36px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 16px; color: #ffffff; text-decoration: none; border-radius: 6px;">Verify Email</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- end button -->

          <!-- start copy -->
          <tr>
            <td align="left" bgcolor="#ffffff" style="padding: 24px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 16px; line-height: 24px;">
              <p style="margin: 0;">If that doesn't work, copy and paste the following link in your browser:</p>
              <p style="margin: 0;"><a href="${process.env.SITE_URL}/verify-email?token=${token} target="_blank">${process.env.SITE_URL}/reset-password?token=${token}</a></p>
            </td>
          </tr>
          <!-- end copy -->

          <!-- start copy -->
          <tr>
            <td align="left" bgcolor="#ffffff" style="padding: 24px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 16px; line-height: 24px; border-bottom: 3px solid #d4dadf">
              <p style="margin: 0;">Cheers,<br> ${process.env.SITE_NAME}</p>
            </td>
          </tr>
          <!-- end copy -->

        </table>
        <!--[if (gte mso 9)|(IE)]>
        </td>
        </tr>
        </table>
        <![endif]-->
      </td>
    </tr>
    <!-- end copy block -->

    <!-- start footer -->
    <tr>
      <td align="center" bgcolor="#e9ecef" style="padding: 24px;">
        <!--[if (gte mso 9)|(IE)]>
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="600">
        <tr>
        <td align="center" valign="top" width="600">
        <![endif]-->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">

          <!-- start permission -->
          <tr>
            <td align="center" bgcolor="#e9ecef" style="padding: 12px 24px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 20px; color: #666;">
              <p style="margin: 0;">You received this email because we received a request for email verification for your account. If you didn't request for eamil verification you can safely delete this email.</p>
            </td>
          </tr>
          <!-- end permission -->

          <!-- start unsubscribe -->
          <tr>
            <td align="center" bgcolor="#e9ecef" style="padding: 12px 24px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 20px; color: #666;">
            </td>
          </tr>
          <!-- end unsubscribe -->

        </table>
        <!--[if (gte mso 9)|(IE)]>
        </td>
        </tr>
        </table>
        <![endif]-->
      </td>
    </tr>
    <!-- end footer -->

  </table>
  <!-- end body -->

</body>
</html>`

      }
      transporter.sendMail(message,(error, info)=>{
        if(error){
          console.log(error)
          res.status(StatusCodes.INTERNAL_SERVER_ERROR).json("something Went Wrong")
        }else{
          console.log('success' + info )
          res.status(StatusCodes.OK).json({token:token})
        
        }
  
      })
    

    }

// Generate a random 12-digit account number
function generateAccountNumber() {
    let accountNumber = '';
    for (let i = 0; i < 12; i++) {
        accountNumber += Math.floor(Math.random() * 10);
    }
    return accountNumber;
}




// ✅ Submit identity verification
const submitIdentityVerification = async (req, res, next) => {
  try {
    const userId = req.user?.sub;
    if (!userId) throw new customErrorAPI('Unauthorized', StatusCodes.UNAUTHORIZED);

    // Get user details
    const user = await UserModel.findById(userId);
    if (!user) throw new customErrorAPI('User does not exist', StatusCodes.CONFLICT);

    // Check if user already has a pending verification
    const existingPending = await IdentityVerification.findOne({
      user: userId,
      status: 'pending'
    });

    if (existingPending) {
      throw new customErrorAPI('You already have a pending identity verification', StatusCodes.CONFLICT);
    }

    // Validate required fields
    const { identity_type, identity_number } = req.body;
    
    if (!identity_type || !identity_number) {
      throw new customErrorAPI('Identity type and number are required', StatusCodes.BAD_REQUEST);
    }

    if (!req.file) {
      throw new customErrorAPI('Identity proof file is required', StatusCodes.BAD_REQUEST);
    }

    // Validate file type
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      // Delete uploaded file if invalid
      fs.unlinkSync(req.file.path);
      throw new customErrorAPI('Only JPEG, PNG, and PDF files are allowed', StatusCodes.BAD_REQUEST);
    }

    // Validate file size (2MB max)
    if (req.file.size > 2 * 1024 * 1024) {
      fs.unlinkSync(req.file.path);
      throw new customErrorAPI('File size must be less than 2MB', StatusCodes.BAD_REQUEST);
    }

    // Create identity verification record
    const identityVerification = await IdentityVerification.create({
      user: userId,
      userEmail: user.email,
      identity_type,
      identity_number: identity_number.toUpperCase().trim(),
      identity_file: req.file.filename
    });

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Identity verification submitted successfully',
      data: {
        id: identityVerification._id,
        identity_type: identityVerification.identity_type,
        identity_number: identityVerification.identity_number,
        status: identityVerification.status,
        submitted_at: identityVerification.submitted_at
      }
    });

  } catch (err) {
    // Clean up uploaded file if error occurs
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(err);
  }
};

// ✅ Get user's identity verification status
const getIdentityVerification = async (req, res, next) => {
  try {
    const userId = req.user?.sub;
    if (!userId) throw new customErrorAPI('Unauthorized', StatusCodes.UNAUTHORIZED);

    const user = await User.findById(userId);
    if (!user) throw new customErrorAPI('User does not exist', StatusCodes.CONFLICT);

    // Get all identity verifications for this user, sorted by latest first
    const verifications = await IdentityVerification.find({ userEmail: user.email })
      .sort({ createdAt: -1 })
      .select('-__v');

    res.status(StatusCodes.OK).json({
      success: true,
      data: verifications
    });

  } catch (err) {
    next(err);
  }
};

// ✅ Get current pending verification (for form pre-fill)
const getCurrentVerification = async (req, res, next) => {
  try {
    const userId = req.user?.sub;
    if (!userId) throw new customErrorAPI('Unauthorized', StatusCodes.UNAUTHORIZED);

    const user = await User.findById(userId);
    if (!user) throw new customErrorAPI('User does not exist', StatusCodes.CONFLICT);

    // Get current pending verification
    const currentVerification = await IdentityVerification.findOne({
      userEmail: user.email,
      status: 'pending'
    }).select('-__v');

    res.status(StatusCodes.OK).json({
      success: true,
      data: currentVerification
    });

  } catch (err) {
    next(err);
  }
};

// ✅ Admin: Get all pending verifications
const getAllPendingVerifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const verifications = await IdentityVerification.find({ status: 'pending' })
      .populate('user', 'firstName lastName email')
      .sort({ submitted_at: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-__v');

    const total = await IdentityVerification.countDocuments({ status: 'pending' });

    res.status(StatusCodes.OK).json({
      success: true,
      data: verifications,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit
      }
    });

  } catch (err) {
    next(err);
  }
};

// ✅ Admin: Update verification status
const updateVerificationStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, rejection_reason } = req.body;
    const adminId = req.user?.sub;

    if (!adminId) throw new customErrorAPI('Unauthorized', StatusCodes.UNAUTHORIZED);

    // Validate status
    if (!['verified', 'rejected'].includes(status)) {
      throw new customErrorAPI('Status must be either verified or rejected', StatusCodes.BAD_REQUEST);
    }

    // If rejected, rejection reason is required
    if (status === 'rejected' && !rejection_reason) {
      throw new customErrorAPI('Rejection reason is required when rejecting verification', StatusCodes.BAD_REQUEST);
    }

    const verification = await IdentityVerification.findById(id);
    if (!verification) {
      throw new customErrorAPI('Verification not found', StatusCodes.NOT_FOUND);
    }

    // Update verification
    verification.status = status;
    verification.reviewed_at = new Date();
    verification.reviewed_by = adminId;
    
    if (status === 'rejected') {
      verification.rejection_reason = rejection_reason;
    }

    await verification.save();

    // If verified, update user's verification status
    if (status === 'verified') {
      await User.findByIdAndUpdate(verification.user, {
        identity_verified: true,
        identity_verified_at: new Date()
      });
    }

    res.status(StatusCodes.OK).json({
      success: true,
      message: `Identity verification ${status} successfully`,
      data: verification
    });

  } catch (err) {
    next(err);
  }
};



    const verifyEmail=async(req,res)=>{
        const {id}=req.user
        console.log(req.user)
        let unique = false;
        let newAccountNumber;

        const user=await UserModel.findById(id)
        if(!user){
            throw new customErrorAPI("No such user exists",StatusCodes.BAD_REQUEST)
        }
        const verifyEmail=await UserModel.findOneAndUpdate({_id:id},{$set:{verifyEmail:true}})

if(!user.accountNumber){
    while (!unique) {
        newAccountNumber = generateAccountNumber();
        const existingAccount = await UserModel.findOne({ accountNumber: newAccountNumber });

        if (!existingAccount) {
            unique = true;
        }
    }

    const account = await UserModel.findOneAndUpdate({ _id:id },{$set:{accountNumber: newAccountNumber}},{new:true});
  

    const transporter = nodemailer.createTransport({
        host: 'smtp.hostinger.com', // e.g., smtp.hostinger.com for Gmail
        port: 465, // or 465 for secure connection
        secure: true, // true for 465, false for other ports
        auth: {
            user: process.env.ADMIN_EMAIL, // your email
            pass: process.env.EMAIL_PASS, // your email password
        },
         tls: {
    // 👇 THIS is what fixes the self-signed cert issue
    rejectUnauthorized: false
  }
    });
   const message={
    from: {
      name: `${process.env.SITE_NAME}`,
      address: `${process.env.ADMIN_EMAIL}`
    },
    to:user.email,
    subject:'Bank Account Number',
    html:`  
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
    <h2 style="color: #056905; text-align: center;">Dear Valued Customer,</h2>
    <p style="font-size: 16px; color: #333;">Thank you for choosing <strong>${process.env.SITE_NAME}</strong>.</p>
    <p style="font-size: 16px; color: #333;">We are pleased to inform you that your new bank account has been successfully created.</p>
    <p style="font-size: 16px; color: #333;"><strong>Your Account Number:</strong> 
        <span style="color: green; font-weight: bold; font-size: 18px;">${account.accountNumber}</span>
    </p>
    <p style="font-size: 16px; color: #333;">Please keep this account number safe and secure for future use.</p>
    <p style="font-size: 16px; color: #333;">If you have any questions, feel free to contact our support team.</p>
    <br>
    <p style="font-size: 16px; color: #333;">Best regards,</p>
    <p style="font-size: 16px; color: #056905; font-weight: bold;">${process.env.SITE_NAME} Support Team</p>
    <p style="font-size: 16px; color: #056905;">
        <a href="${process.env.SITE_URL}" style="color: #056905; text-decoration: none;">${process.env.SITE_URL}</a>
    </p>
    <div style="margin-top: 20px; text-align: center; padding: 10px; background-color: #f9f9f9; border-top: 1px solid #e0e0e0;">
        <p style="font-size: 14px; color: #999;">Please do not reply to this email. If you have any questions, contact us via our website.</p>
    </div>
</div>
`
  }
  transporter.sendMail(message,(error, info)=>{
    if(error){
      console.log(error)
    //   res.status(StatusCodes.INTERNAL_SERVER_ERROR).json("something Went Wrong")
    }else{
      console.log('success' + info )
    //   res.status(StatusCodes.OK).json(verifyEmail)
    res.status(StatusCodes.OK).json(verifyEmail)
    }

  })
}else{
  res.status(StatusCodes.OK).json(verifyEmail)
}

      

 }


 const getUser=async(req,res)=>{
    const {id}=req.user

    const user=await UserModel.findById(id)

        if(!user){
            throw new customErrorAPI("No such user exists",StatusCodes.BAD_REQUEST)
        }

        res.status(StatusCodes.OK).json(user)


 }

const forgotpassword=async(req,res)=>{
    const {email}=req.body

    const user=await UserModel.findOne({email:email})

    if(!user){
        throw new customErrorAPI("No user with email exists",StatusCodes.CONFLICT)
    }


    const token=await user.signJWT()
    const transporter = nodemailer.createTransport({
        host: 'smtp.hostinger.com', // e.g., smtp.hostinger.com for Gmail
        port: 465, // or 465 for secure connection
        secure: true, // true for 465, false for other ports
        auth: {
            user: process.env.ADMIN_EMAIL, // your email
            pass: process.env.EMAIL_PASS, // your email password
        },
         tls: {
    // 👇 THIS is what fixes the self-signed cert issue
    rejectUnauthorized: false
  }
    });
   const message={
    from: {
      name: `${process.env.SITE_NAME}`,
      address: `${process.env.ADMIN_EMAIL}`
    },
    to:user.email,
    subject:'Password Reset',
    html:`<!DOCTYPE html>
<html>
<head>

<meta charset="utf-8">
<meta http-equiv="x-ua-compatible" content="ie=edge">
<title>Password Reset</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style type="text/css">
@media screen {
@font-face {
  font-family: 'Source Sans Pro';
  font-style: normal;
  font-weight: 400;
  src: local('Source Sans Pro Regular'), local('SourceSansPro-Regular'), url(https://fonts.gstatic.com/s/sourcesanspro/v10/ODelI1aHBYDBqgeIAH2zlBM0YzuT7MdOe03otPbuUS0.woff) format('woff');
}
@font-face {
  font-family: 'Source Sans Pro';
  font-style: normal;
  font-weight: 700;
  src: local('Source Sans Pro Bold'), local('SourceSansPro-Bold'), url(https://fonts.gstatic.com/s/sourcesanspro/v10/toadOcfmlt9b38dHJxOBGFkQc6VGVFSmCnC_l7QZG60.woff) format('woff');
}
}

body,
table,
td,
a {
-ms-text-size-adjust: 100%;
-webkit-text-size-adjust: 100%;
}

table,
td {
mso-table-rspace: 0pt;
mso-table-lspace: 0pt;
}

img {
-ms-interpolation-mode: bicubic;
}

a[x-apple-data-detectors] {
font-family: inherit !important;
font-size: inherit !important;
font-weight: inherit !important;
line-height: inherit !important;
color: inherit !important;
text-decoration: none !important;
}

div[style*="margin: 16px 0;"] {
margin: 0 !important;
}

body {
display:flex;
flex-direction:column;
align-items:center
justify-content:center;
width: 100% !important;
height: 100% !important;
padding: 0 !important;
margin: 0 !important;
background-color: #f4f4f4;
}

table {
border-collapse: collapse !important;
}

a {
color: #056905c2;
}

img {
height: auto;
line-height: 100%;
text-decoration: none;
border: 0;
outline: none;
}

h1 {
color: #056905c2;
font-size: 28px;
font-weight: 700;
}

</style>

</head>
<body style="background-color: #f4f4f4;">

<div class="preheader" style="display: none; max-width: 0; max-height: 0; overflow: hidden; font-size: 1px; line-height: 1px; color: #fff; opacity: 0;">
Reset your password to regain access to your account.
</div>

<table border="0" cellpadding="0" cellspacing="0" width="100%">

<tr>
  <td align="center" bgcolor="#f4f4f4">
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
      <tr>
        <td align="center" valign="top" style="padding: 36px 24px;">
          <a href="https://www.yourcompany.com" target="_blank" style="display: inline-block;">
            <img src="https://www.yourcompany.com/logo.png" alt="Company Logo" border="0" width="48" style="display: block; width: 48px;">
          </a>
        </td>
      </tr>
    </table>
  </td>
</tr>

<tr>
  <td align="center" bgcolor="#f4f4f4">
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
      <tr>
        <td align="left" bgcolor="#ffffff" style="padding: 36px 24px 0; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; border-top: 3px solid #056905c2;">
          <h1 style="margin: 0; font-size: 28px; font-weight: 700;">Reset Your Password</h1>
        </td>
      </tr>
    </table>
  </td>
</tr>

<tr>
  <td align="center" bgcolor="#f4f4f4">
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
      <tr>
        <td align="left" bgcolor="#ffffff" style="padding: 24px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 16px; line-height: 24px;">
          <p style="margin: 0;">Click the button below to reset your password. If you did not request a password reset, you can safely disregard this email.</p>
        </td>
      </tr>

      <tr>
        <td align="left" bgcolor="#ffffff">
          <table border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td align="center" bgcolor="#ffffff" style="padding: 12px;">
                <table border="0" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center" bgcolor="#056905c2" style="border-radius: 6px;">
                      <a href="${process.env.SITE_URL}/reset-password?token=${token}" target="_blank" style="display: inline-block; padding: 16px 36px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 16px; color: #ffffff; text-decoration: none; border-radius: 6px;">Reset Password</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <tr>
        <td align="left" bgcolor="#ffffff" style="padding: 24px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 16px; line-height: 24px;">
          <p style="margin: 0;">If the button above doesn't work, copy and paste the following link into your browser:</p>
          <p style="margin: 0;"><a href="${process.env.SITE_NAME}/reset-password?token=${token}" target="_blank">${process.env.SITE_URL}/reset-password?token=${token}</a></p>
        </td>
      </tr>

      <tr>
        <td align="left" bgcolor="#ffffff" style="padding: 24px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 16px; line-height: 24px; border-bottom: 3px solid #056905c2">
          <p style="margin: 0;">Thank you,<br>${process.env.SITE_NAME}</p>
        </td>
      </tr>

    </table>
  </td>
</tr>

<tr>
  <td align="center" bgcolor="#f4f4f4" style="padding: 24px;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
      <tr>
        <td align="center" bgcolor="#f4f4f4" style="padding: 12px 24px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 20px; color: #666;">
          <p style="margin: 0;">You received this email because you requested a password reset for your account. If you did not make this request, you can safely ignore this email.</p>
        </td>
      </tr>
    </table>
  </td>
</tr>

</table>

</body>
</html>

`

  }
  transporter.sendMail(message,(error, info)=>{
    if(error){
      console.log(error)
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json("something Went Wrong")
    }else{
      console.log('success' + info )
      res.status(StatusCodes.OK).json({token:token})
     
    
    }

  })


}


const resetPassword=async(req,res)=>{
    const {id}=req.user
    const user=await UserModel.findById(id)

    if(!user){
        throw new customErrorAPI("User does not exist",StatusCodes.CONFLICT)
    }
    const {password}=req.body
    if(!password){
        throw new customErrorAPI("Enter new password",StatusCodes.BAD_REQUEST)
    }

    const salt=await bycrypt.genSalt(10)
   const  hashedPassword=await bycrypt.hash(password,salt)


    const updatePassword=await UserModel.findOneAndUpdate({_id:id},{$set:{password:hashedPassword}})


    res.status(StatusCodes.OK).json(updatePassword)

}

const changePassword = async (req, res) => {
    const id = req.user.sub; // Extract user ID from the authenticated user
    const user = await UserModel.findById(id);
    
    if (!user) {
        throw new customErrorAPI("No such user exists", StatusCodes.NOT_FOUND);
    }

    const { oldPassword, password, password_confirmation } = req.body;

    // Validate required fields
    if (!oldPassword) {
        throw new customErrorAPI("Current password is required", StatusCodes.BAD_REQUEST);
    }

    if (!password) {
        throw new customErrorAPI("New password is required", StatusCodes.BAD_REQUEST);
    }

    if (!password_confirmation) {
        throw new customErrorAPI("Please confirm your new password", StatusCodes.BAD_REQUEST);
    }

    // Verify current password
    const isCurrentPasswordValid = await bycrypt.compare(oldPassword, user.password);
    if (!isCurrentPasswordValid) {
        throw new customErrorAPI("Current password is incorrect", StatusCodes.BAD_REQUEST);
    }

    // Check if new password matches confirmation
    if (password !== password_confirmation) {
        throw new customErrorAPI("New password and confirmation do not match", StatusCodes.BAD_REQUEST);
    }

    // Check if new password is different from old password
    if (oldPassword === password) {
        throw new customErrorAPI("New password must be different from current password", StatusCodes.BAD_REQUEST);
    }

    // Check password length
    if (password.length < 6) {
        throw new customErrorAPI("Password must be at least 6 characters long", StatusCodes.BAD_REQUEST);
    }

    // Hash new password
    const salt = await bycrypt.genSalt(10);
    const hashedPassword = await bycrypt.hash(password, salt);

    // Update password
    const updatePassword = await UserModel.findOneAndUpdate(
        { _id: id },
        { $set: { password: hashedPassword } },
        { new: true } // Return updated document
    );

    res.status(StatusCodes.OK).json({
        message: "Password updated successfully",
        user: {
            id: updatePassword._id,
            email: updatePassword.email
        }
    });
};
 const updateUser=async(req,res)=>{
  const {id}=req.user
    const user=await UserModel.findById(id)
    let updateData;

    if(req.file){
      const fileName=req?.file?.filename
      updateData = { ...req.body,profile:fileName };
    }else{
      updateData = { ...req.body };
    }
    if(!user){
        throw new customErrorAPI("User does not exist",StatusCodes.CONFLICT)
    }

    const updatedUser = await UserModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }  // `new: true` returns the updated document
    );

    res.status(StatusCodes.OK).json(updatedUser)


 }



 const paymentRequestAction=async(req,res)=>{


  const {id}=req.user

  const user=await UserModel.findById(id)

  if(!user){
      throw new customErrorAPI("User does not exist",StatusCodes.CONFLICT)
  }

  const {action,paymentReqId}=req.body

  const paymentRequest=await PaymentRequestModel.findOne({_id:paymentReqId})

  if(user.email!==receiver||user.accountNumber!==receiver){
    throw new customErrorAPI("Only the reciever can confirm payment request",StatusCodes.UNAUTHORIZED)
  }


  if(action=='approve'){
     const balance=user.balance[paymentRequest.currency]

     if(paymentRequest.amount>balance){
      throw new customErrorAPI("You  balance is insufficient to grant this payment request",StatusCodes.CONFLICT)
     }

     const updateRequest=await PaymentRequestModel.findOneAndUpdate({_id:paymentReqId},{$set:{status:'approved'}})

     const updateSenderBalance=await UserModel.findOneAndUpdate({email:paymentRequest.userEmail},{$inc:{[`balance.${paymentRequest.currency}`]:paymentRequest.amount}})

     if(validator.isEmail(paymentRequest.receiverAccount)){
      const updateApproverBalance= await UserModel.findOneAndUpdate({email:paymentRequest.receiverAccount},{$inc:{[`balance.${paymentRequest.currency}`]:paymentRequest.amount}})
     }else{
      const updateApproverBalance= await UserModel.findOneAndUpdate({accountNumber:paymentRequest.receiverAccount},{$inc:{[`balance.${paymentRequest.currency}`]:paymentRequest.amount}})
     }

     res.status(StatusCodes.OK).json(updateApproverBalance)
  }else if(action=='rejected'){
    const updateRequest=await PaymentRequestModel.findOneAndUpdate({_id:paymentReqId},{$set:{status:'rejected'}})

    res.status(StatusCodes.OK).json(updateRequest)

  }else{
    throw new customErrorAPI("Bad Request",StatusCodes.BAD_REQUEST)

  }


}


const getTicketById = async (req, res, next) => {
  try {
    const ticketId = req.params.id;
    const ticket = await TicketModel.findById(ticketId);
    if (!ticket) throw new customErrorAPI('Ticket not found', StatusCodes.NOT_FOUND);

    const replies = await Reply.find({ ticketId }).sort({ createdAt: 1 });

    res.status(StatusCodes.OK).json({ ticket, replies });
  } catch (err) {
    next(err);
  }
};



const userReply = async (req, res, next) => {
  try {
    console.log(req.body)
    const { message } = req.body;
    const ticketId = req.params.id;

    const ticket = await TicketModel.findById(ticketId);
    if (!ticket) throw new customErrorAPI('Ticket not found', StatusCodes.NOT_FOUND);

    // Add reply
    await Reply.create({
      ticketId,
      sender: 'user',
      message
    });

    // Update ticket metadata
    ticket.lastMessageAt = new Date();
    ticket.lastSender = 'user';
    ticket.unreadByAdmin = (ticket.unreadByAdmin || 0) + 1;
    await ticket.save();

    res.status(StatusCodes.OK).json({ success: true });
  } catch (err) {
    next(err);
  }
};

const getRepliesForUser = async (req, res, next) => {
  try {
    const ticketId = req.params.id;
    const userId = req.user?.sub;
    const userEmail = req.user?.email;

    const ticket = await TicketModel.findById(ticketId).lean();
    if (!ticket) throw new customErrorAPI('Ticket not found', StatusCodes.NOT_FOUND);

    // Ownership check (support either userId or userEmail depending on your stored fields)
    const ownsById = ticket.userId?.toString?.() === userId;
    const ownsByEmail = ticket.userEmail && userEmail && ticket.userEmail === userEmail;
    if (!(ownsById || ownsByEmail)) {
      throw new customErrorAPI('Forbidden', StatusCodes.FORBIDDEN);
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
      Reply.find(filter).sort({ createdAt: 1 }).skip((pg - 1) * lm).limit(lm).lean(),
      Reply.countDocuments({ ticketId })
    ]);

    return res.status(StatusCodes.OK).json({
      success: true,
      ticket: { _id: ticket._id, ticketId: ticket.ticketId, subject: ticket.subject, status: ticket.status },
      page: pg,
      limit: lm,
      total,
      count: replies.length,
      replies
    });
  } catch (err) {
    next(err);
  }
};


const adminReply = async (req, res, next) => {
  try {
    const { message } = req.body;
    const ticketId = req.params.id;

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) throw new customErrorAPI('Ticket not found', StatusCodes.NOT_FOUND);

    await Reply.create({
      ticketId,
      sender: 'admin',
      message
    });

    // Update ticket
    ticket.lastMessageAt = new Date();
    ticket.lastSender = 'admin';
    ticket.unreadByUser = (ticket.unreadByUser || 0) + 1;
    if (ticket.status === 'Open') ticket.status = 'In Progress';
    await ticket.save();

    res.status(StatusCodes.OK).json({ success: true });
  } catch (err) {
    next(err);
  }
};

const updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const ticketId = req.params.id;

    const validStatuses = ['Open', 'In Progress', 'Resolved', 'Closed'];
    if (!validStatuses.includes(status))
      throw new customErrorAPI('Invalid status', StatusCodes.BAD_REQUEST);

    const ticket = await Ticket.findByIdAndUpdate(
      ticketId,
      { status },
      { new: true }
    );

    res.status(StatusCodes.OK).json(ticket);
  } catch (err) {
    next(err);
  }
};


const { WithdrawalSetting, METHODS } = require('../models/WithdrawalSettings');
const WithdrawalSettings = require("../models/WithdrawalSettings");

// ---- helpers ----
function pick(obj, keys) {
  const out = {};
  keys.forEach(k => { if (obj[k] !== undefined) out[k] = obj[k]; });
  return out;
}

function validatePayloadByType(body) {
  const type = Number(body.type);

  if (![METHODS.PAYPAL, METHODS.BANK, METHODS.CRYPTO].includes(type)) {
    throw new customErrorAPI('Invalid withdrawal type', StatusCodes.BAD_REQUEST);
  }

  if (type === METHODS.PAYPAL) {
    if (!body.email) throw new customErrorAPI('Email is required for PayPal', StatusCodes.BAD_REQUEST);
    return { type, ...pick(body, ['email']), default_payout: body.default_payout ? 1 : 0 };
  }

  if (type === METHODS.BANK) {
    const required = ['account_name','account_number','bank_name','bank_branch_name','bank_branch_city','bank_branch_address','country','swift_code'];
    for (const f of required) {
      if (!body[f]) throw new customErrorAPI(`Missing field: ${f}`, StatusCodes.BAD_REQUEST);
    }
    return {
      type,
      ...pick(body, [
        'account_name','account_number','bank_name',
        'bank_branch_name','bank_branch_city','bank_branch_address',
        'country','swift_code'
      ]),
      default_payout: body.default_payout ? 1 : 0
    };
  }

  // CRYPTO
  if (!body.currency) throw new customErrorAPI('Currency is required for Crypto', StatusCodes.BAD_REQUEST);
  if (!body.crypto_address) throw new customErrorAPI('Crypto address is required for Crypto', StatusCodes.BAD_REQUEST);
  return { type, ...pick(body, ['currency','crypto_address']), default_payout: body.default_payout ? 1 : 0 };
}

// ---- create ----
const createWithdrawalSetting = async (req, res) => {
  const userId = req.user?.sub;              // from your auth middleware
  const user = await UserModel.findById(userId);
  if (!user) throw new customErrorAPI('No such user exists', StatusCodes.BAD_REQUEST);

  const data = validatePayloadByType(req.body);

  // If setting default_payout=1, unset others for this user
  if (data.default_payout === 1) {
    await WithdrawalSetting.updateMany({ userId }, { $set: { default_payout: 0 } });
  }

  const item = await WithdrawalSetting.create({ userId, ...data });
  res.status(StatusCodes.CREATED).json({ item });
};

// ---- list (with optional filter by ?method=all|3|5|8) ----
const listWithdrawalSettings = async (req, res) => {
  const userId = req.user?.sub;
  const user = await UserModel.findById(userId);
  if (!user) throw new customErrorAPI('No such user exists', StatusCodes.BAD_REQUEST);

  const method = (req.query.method || 'all').toString();
  const q = { userId };

  if (method !== 'all') {
    const t = Number(method);
    if (![METHODS.PAYPAL, METHODS.BANK, METHODS.CRYPTO].includes(t)) {
      throw new customErrorAPI('Invalid method filter', StatusCodes.BAD_REQUEST);
    }
    q.type = t;
  }

  const items = await WithdrawalSetting.find(q).sort({ createdAt: -1 }).lean();
  res.status(StatusCodes.OK).json({ items });
};

// ---- update ----
const updateWithdrawalSetting = async (req, res) => {
  const userId = req.user?.sub;
  const id = req.params.id;

  const existing = await WithdrawalSetting.findOne({ _id: id, userId });
  if (!existing) throw new customErrorAPI('Not found', StatusCodes.NOT_FOUND);

  const data = validatePayloadByType({ ...existing.toObject(), ...req.body, type: req.body.type ?? existing.type });

  if (data.default_payout === 1) {
    await WithdrawalSetting.updateMany({ userId, _id: { $ne: id } }, { $set: { default_payout: 0 } });
  }

  Object.assign(existing, data);
  await existing.save();

  res.status(StatusCodes.OK).json({ item: existing });
};

// ---- delete ----
const deleteWithdrawalSetting = async (req, res) => {
  const userId = req.user?.sub;
  const id = req.params.id;
console.log(req.params)
  const doc = await WithdrawalSetting.findOneAndDelete({ _id: id, userId });
  if (!doc) throw new customErrorAPI('Not found', StatusCodes.NOT_FOUND);

  res.status(StatusCodes.NO_CONTENT).send();
};

module.exports = {
  
};


    module.exports={createUser,transactionHistory,loginUser,getCurrencies,getQuote,sendMoney,exchangeMoney,paymentRequest,deposit,giftCard,withdraw,applyLoan,fixedDeposit,dps,tickets,userVerifiedEmail,resendEmailVerification,verifyEmail,getUser,getPaymentRequest,getLoans,getFixedDeposit,getDpsSchemes,resetPassword,forgotpassword,updateUser,paymentRequestAction,getTickets,createWithdrawalSetting,
  listWithdrawalSettings,updateStatus,adminReply,userReply,getTicketById,getRepliesForUser,getRepliesForUser,
  updateWithdrawalSetting,
  submitIdentityVerification,
  getIdentityVerification,
  getCurrentVerification,
  getAllPendingVerifications,
  updateVerificationStatus,
  deleteWithdrawalSetting,changePassword,updateProfile,
  submitAddressVerification,
  getAddressVerification}
