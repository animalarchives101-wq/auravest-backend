const mongoose=require('mongoose')

const refundSchema=new mongoose.Schema({
    refundNumber:{
        type:String,
        required:true,
        unique:true
    },
    name:{
        type:String,
        required:true
    },
    phoneNumber:{
        type:String,
        required:true
    },
    address:{
        type:String,
        required:true,

    },
    totalRefund:{
        type:Number,
        required:true
    },
    refundDate:{
        type:Date,
        required:true
    },
    accountNumber:{
        type:String,
        required:true,
    },
    bankName:{
        type:String,
        required:true,
    }

},{timestamps:true})


const RefundModel= mongoose.model('refunds',refundSchema)

module.exports=RefundModel