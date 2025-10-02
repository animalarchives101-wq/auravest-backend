const mongoose=require('mongoose')


const sendMoneySchema= new mongoose.Schema({
    senderId:{
        type:String,
        required:true
    },
    recipientEmail:{
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
    status:{
        type:String,
        enum:['approved','pending',"success"],
        default:'success'
    }


},{timestamps:true})


const SendMoneyModel= mongoose.model('send_money',sendMoneySchema)

module.exports=SendMoneyModel