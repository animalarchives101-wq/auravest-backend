const mongoose=require('mongoose')


const giftCardSchema=new mongoose.Schema({
    userEmail:{
        type:String,
        required:true
    },
    code:{
        type:String,
        required:true
    },
    type:{
        type:String,
        required:true,
        default:'gift card'
    },
    status:{
        type:String,
        enum:['approved','pending','rejected'],
        default:'pending'
    }
},{timestamps:true})


const GiftCardModel=mongoose.model("gift_cards",giftCardSchema)

module.exports=GiftCardModel