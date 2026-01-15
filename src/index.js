// require('dotenv').config({path : './env'}) //we try not to use this as it does not maintain the consistency of code as we uses import statement in most of our code 


// import mongoose from "mongoose"
// import { DB_NAME } from "./constants.js" 
import dotenv from "dotenv"
import connectDB from "./db/index.js"
import {app} from "./app.js"

dotenv.config({
    path : './.env'
})



connectDB()
.then(()=>{
    app.on("error" ,(error)=>{
        console.log("failed" , error);
        throw err
    })
    app.listen(process.env.PORT || 8000 , ()=>{
        console.log(`server is running on port ${process.env.PORT}`); 
    })
})
.catch((err)=>{
    console.log("MONGODB connection failed at index file");
    
})





/*
//this is from the 7th video connecting database
import express from "express"
const app = express()

(async () => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on("error" ,(error)=>{
            console.error("Error : " , error);
            throw error
        })
        app.listen(process.env.PORT , ()=>{
            console.log(`app is listening on port 8000 , ${process.env.PORT}`);
        })
    } catch (error) {
        console.error("Error : ", error);
        throw error
    }
})()*/