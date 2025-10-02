const mongoose=require('mongoose')

const depositSchema=new mongoose.Schema({
    amount:{
        type:Number,
        required:true
    },
    userEmail:{
        type:String,
        required:true
    },
    currency:{
        type:String,
        required:true,
        default:"USD"

    },
    trx:{
        type:String,
        required:true,

    },
    method:{
        type:String,
        reuired:true
    },
    img:{
        type:String
    },
    note:{
        type:String,

    },
    type:{
    type:String,
     default:'deposit'
    },
    status:{
        type:String,
        enum:['Successful','Failed','pending'],
        default:'pending' 
    },
},{timestamps:true})




const DepositModel= mongoose.model('deposits',depositSchema)


module.exports=DepositModel