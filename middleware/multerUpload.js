const multer=require('multer')
const path=require('path')


console.log()
const storage=multer.diskStorage({
    destination:(req,file,cb)=>{
        const relativePath=path.join(__dirname,'../public/images')
        cb(null,relativePath)
    },
    filename:(req,file,cb)=>{
        cb(null,file.fieldname + '_' + Date.now() + path.extname(file.originalname))
    }
    
})
const upload=multer({
    storage:storage
})

module.exports=upload