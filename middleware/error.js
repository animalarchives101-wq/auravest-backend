const customErrorAPI = require("../customError/customError")
const {StatusCodes}=require('http-status-codes')
const error=async(err,req,res,next)=>{

    if(err instanceof customErrorAPI){
        console.log(err)
        res.status(err.status).json({error:err.message})
    }else{
        console.log(err)
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({error:"INTERNAL SERVER ERROR"})
    }
    next()

    

}

module.exports=error