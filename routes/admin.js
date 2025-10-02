const express=require('express')
const {createAdmin,loginAdmin,sendEmail,checkToken,updateUserBalance, deleteUser, acceptLoan, approveDPS, getAllDeposits, getTickets, users,getFixDeposits,deleteTicket,chnageDepositStatus, deleteDeposit,getLoans,deleteLoan, deletCard, cardStatus,giftCard, fixedDepositStatus, deleteFixedDeposit,isAdmin}=require('../controllers/admin')
const auth=require('../middleware/auth')
const router=express.Router()

router.route('/create-admin').post(createAdmin)
router.route('/login-admin').post(loginAdmin)
router.route('/send-email').post(sendEmail)
router.route('/check-token').get(auth,checkToken)
router.route('/update-balance/:userId').post(auth,updateUserBalance)
router.route('/delete-user/:userId').delete(auth,deleteUser)
router.route('/loan/:loanId').post(auth,acceptLoan)
router.route('/dps/:dpsId').post(auth,approveDPS)
router.route('/deposits/').get(auth,getAllDeposits)
router.route('/deposit/:depositId').post(auth,chnageDepositStatus)
router.route('/tickets/').get(auth,getTickets)
router.route('/users/').get(auth,users)
router.route('/loans/').get(auth,getLoans)
router.route('/delete-loan/:loanId').delete(auth,deleteLoan)
// router.route('/get-dps/').get(auth,getFixDeposits)
router.route('/delete-ticket/:tId').delete(auth,deleteTicket)
router.route('/delete-deposit/:depositId').delete(auth,deleteDeposit)


router.route('/gift-card/').get(auth,giftCard)
router.route('/isadmin').get(auth,isAdmin)
router.route('/gift-card-status/:cardId').post(auth,cardStatus)
router.route('/delete-card/:cardId').delete(auth,deletCard)

router.route('/get-fd/').get(auth,getFixDeposits)
router.route('/fd-status/:fdId').post(auth,fixedDepositStatus)
router.route('/delete-fd/:fdId').delete(auth,deleteFixedDeposit)

module.exports=router