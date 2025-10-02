const mongoose=require('mongoose')



const paymentRequestSchema=new mongoose.Schema({
    rsenderEmail:{
        type:String,
        required:true
    },
    currency:{
        type:String,
        required:true
    },
    amount:{
        type:Number,
        required:true
    },
    note:{
        type:String
    },
    userEmail:{
        type:String,
        required:true
    },
    status:{
        type:String,
        enum:['approved','pending','rejected'],
        default:'pending'
    }
},{timestamps:true})




const PaymentRequestModel=mongoose.model('payment_request',paymentRequestSchema)

module.exports=PaymentRequestModel