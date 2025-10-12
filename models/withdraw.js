const mongoose=require('mongoose')

const withdrawSchema=new mongoose.Schema({
    amount:{
        type:Number,
        required:true
    },
    userEmail:{
        type:String,
        required:true
    },
    method:{
        type:String,
        reuired:true
    },
    toAddress:{
        type:String,

    },
    currency:{
        type:String,
        required:true
    },

    type:{
        type:String,
        required:true,
        default:'withdrawal'

    },
    trx:{
        type:String,
        required:true,
    },
    
    status:{
        type:String,
        enum:['pending', 'approved','failed','cancelled'],
        default:'pending'
    }
},{timestamps:true})


const WithdrawModel= mongoose.model('withdraw',withdrawSchema)

module.exports=WithdrawModel
