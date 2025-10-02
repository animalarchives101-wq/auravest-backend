const mongoose=require('mongoose')
const bycrypt=require('bcryptjs')
const jwt=require('jsonwebtoken')
const adminSchema=new mongoose.Schema({
    username:{
        type:String,
        required:true
    },
    password:{
        type:String,
        required:true
    }
},{timestamps:true})


adminSchema.pre('save',async function(next){

    const salt=await bycrypt.genSalt(10)
    this.password=await bycrypt.hash(this.password,salt)
})

adminSchema.methods.signJWT=function(){
    return jwt.sign({id:this._id,username:this.username},process.env.JWT_SECRET,{expiresIn:'1d'})
}

adminSchema.methods.verifyPassword=async function(password){
    const isMatch= await bycrypt.compare(password,this.password)
    return isMatch
}

const AdminModel= mongoose.model('admin',adminSchema)

module.exports=AdminModel