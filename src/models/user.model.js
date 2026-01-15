import mongoose from "mongoose"

const userSchema = new mongoose.Schema(
    {
        username : {
            type : string , 
            required : true , 
            unique : true ,
            lowercase : true , 
            trim : true ,
            index : true  
        }, 
        email : {
            type : string , 
            required : true , 
            unique : true ,
            lowercase : true , 
            trim : true 
        },
        fullName : {
            type : string , 
            required : true , 
            lowercase : true , 
            trim : true 
        },
        avatar : {
            type : string , //cloudinary url 
            required : true 
        }, 
        avatar : {
            type : string  //cloudinary url
        }, 
        watchHistory : [
            {
                type : Schema.Types.ObjectId, 
                ref : "Video"
            }
        ],
        password : {
            type : string ,
            required : [
                true, 'passoword is required'
            ]
        },
        refreshToken : {
            type : string 
        }
    },{
        timestamps : true 
    }
)



export const user = mongoose.model("User" , userSchema)