const mongoose=require('mongoose')
const bycrypt=require('bcryptjs')
const jwt=require('jsonwebtoken')

const userSchema=new mongoose.Schema({
    firstname:{
        type:String,
        required:true
    },
    lastname:{
        type:String,
        required:true
    },
   
    phoneNumber:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true
    },
    
    password:{
        type:String,
        required:true
    },

    // verifyEmail:{
    //     type:Boolean,
    //     default:false
    // },
    balance:
        {
            USD:{
                type:Number,
                default:0
            },
            EUR:{
                type:Number,
                default:0
            },
            GBP:{
                type:Number,
                default:0
            }

        }

},{timestamps:true})

userSchema.pre('save',async function(next){

    const salt=await bycrypt.genSalt(10)
    this.password=await bycrypt.hash(this.password,salt)
})

userSchema.methods.signJWT=function(){
    return jwt.sign({id:this._id,username:this.username},process.env.JWT_SECRET,{expiresIn:'1d'})
}

userSchema.methods.verifyPassword=async function(password){
    const isMatch= await bycrypt.compare(password,this.password)
    return isMatch
}



const UserModel= mongoose.model('users',userSchema)

module.exports=UserModel