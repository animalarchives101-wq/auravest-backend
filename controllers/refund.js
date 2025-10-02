const { StatusCodes } = require("http-status-codes")
const customErrorAPI = require("../customError/customError")
const AdminModel = require("../models/adminModel")
const RefundModel = require("../models/refundModel")

const createRefund=async(req,res)=>{
    const {id}=req.user
    console.log(id)

    console.log(req.body)

    const admin=await AdminModel.findById(id)

    if(!admin){
        throw new customErrorAPI("Not Eligible to access route",403)
    }
     

    const {name,refundNumber,phoneNumber,address,totalRefund,refundDate,bankName,accountNumber}=req.body

    const refundNumberExitsts=await RefundModel.findOne({refundNumber:refundNumber})
    if(refundNumberExitsts){
        throw new customErrorAPI("Refund Number Already Exists",StatusCodes.CONFLICT)
    }


    if(!bankName||!accountNumber||!name||!refundNumber||!phoneNumber||!address||!totalRefund,!refundDate){
        throw new customErrorAPI("Enter Values for all Reuired Fields",StatusCodes.BAD_REQUEST)
    }

    const refund=await RefundModel.create(req.body)

    if(!refund){
        throw new customErrorAPI("Something went Wrong while creating refund Data",StatusCodes.INTERNAL_SERVER_ERROR)
    }

    res.status(StatusCodes.OK).json(refund)
}


const getAllRefunds=async(req,res)=>{
    const {id}=req.user
    const admin=await AdminModel.findById(id)

    if(!admin){
        throw new customErrorAPI("Not Eligible to access route",403)
    }

    const getAllRefunds=await RefundModel.find().sort({createdAt:-1})

    res.status(StatusCodes.OK).json(getAllRefunds)
}

const getSingleRefund=async(req,res)=>{

   const {refundNumber}=req.params

      if(!refundNumber){
        throw new customErrorAPI("Enter a valid refund Number",StatusCodes.BAD_REQUEST)
      }

      const refundNumberData=await RefundModel.findOne({refundNumber:refundNumber})

      if(!refundNumberData){
        throw new customErrorAPI("Invalid Refund Number", StatusCodes.NOT_FOUND)
      }

      res.status(StatusCodes.OK).json(refundNumberData)

}

const deleteRefund=async(req,res)=>{
    const {id}=req.user
    const admin=await AdminModel.findById(id)

    if(!admin){
        throw new customErrorAPI("Not Eligible to access route",403)
    }

      const {refundNumber}=req.params

      if(!refundNumber){
        throw new customErrorAPI("Enter a valid refund Number",StatusCodes.BAD_REQUEST)
      }

      const deleteRefund=await RefundModel.deleteOne({refundNumber:refundNumber})

      res.status(200).json(deleteRefund)

}

const updateRefund=async(req,res)=>{
    const {id}=req.user
    const admin=await AdminModel.findById(id)

    if(!admin){
        throw new customErrorAPI("Not Eligible to access route",403)
    }

      const {refundNumber}=req.params

      if(!refundNumber){
        throw new customErrorAPI("Enter a valid refund Number",StatusCodes.BAD_REQUEST)
      }


      const editRefund=await RefundModel.findOneAndUpdate({refundNumber:refundNumber},req.body)

      res.status(200).json(editRefund)
}

module.exports={createRefund,getAllRefunds,getSingleRefund,updateRefund,deleteRefund}