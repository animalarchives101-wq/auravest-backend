const express=require('express')
const {createRefund,getAllRefunds,getSingleRefund,updateRefund,deleteRefund}=require('../controllers/refund')
const auth=require('../middleware/auth')
const cronResponse =require('../controllers/cron')
const router=express.Router()

router.route('/create-refund').post(auth,createRefund)
router.route('/get-refund').get(auth,getAllRefunds)
router.route('/get-refund/:refundNumber').get(getSingleRefund)
router.route('/update-refund/:refundNumber').put(auth,updateRefund)
router.route('/delete-refund/:refundNumber').delete(auth,deleteRefund)
router.route('/cron-activate').get(cronResponse)



module.exports=router