const mongoose=require('mongoose')

const fixedDepositSchema=new mongoose.Schema({
    tenure:{
        type:String,
        required:true
    },
    currency:{
        type:String,
        required:true
    },
    img:{
        type:String
    },
    userEmail:{
        type:String,
        required:true

    },
    amount:{
        type:Number,
        required:true
    },
    returnAmount:{
        type:String,
        required:true
    },
    matureDate:{
        type:Date,
        required:true

    },
    status:{
        type:String,
        enum:['approved','pending','rejected'],
        default:'pending'
    },
    note:{
        type:String,
    }
},{timestamps:true})


const FixedDepositModel=mongoose.model('fixed_deposit',fixedDepositSchema)

module.exports=FixedDepositModel
