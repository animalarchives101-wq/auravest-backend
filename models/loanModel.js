const mongoose=require('mongoose')


const loanSchema=new mongoose.Schema({
    loanProduct:{
        type:String,
        required:true
    },
    currency:{
        type:String,
        required:true
    },
    firstPaymentDate:{
        type:Date,
        required:true
    },

    amount:{
        type:Number,
        required:true
    },
    totalpayableAmount:{
        type:Number,
        required:true

    },
    amountPaid:{
        type:Number,
        default:0.00
    },
    dueAmount:{
        type:Number,
        required:true
  

    },
    userEmail:{
        type:String,
        required:true
    },
    note:{
        type:String
    },
    img:{
        type:String
    },
    status:{
        type:String,
        enum:['approved','pending','rejected'],
        default:'pending'
    }
 
    
},{timestamps:true})


const LoandModel=mongoose.model("loan",loanSchema)

module.exports=LoandModel