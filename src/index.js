// require('dotenv').config({path : './env'});

import dotenv from "dotenv"
import connectDB from "./db/index.js";

dotenv.config({
    path : './env'
})

connectDB()
.then(()=>{
    try {
        app.on("error",(error)=>{
            console.log("App Error: ",error);
            throw error
        })

        app.listen(process.env.PORT || 8000 , ()=>{
            console.log(`Server listening on Port: ${process.env.PORT}`);
        })
    } catch (error) {
        console.log("Server listening error: ",error);
    }
})
.catch((err) => {
    console.log("MongoDB connection failed!! ",err);
}) 










/* WHEN PUTTING ALL CODE IN INDEX.JS ONLY */
// -> Method 1
// function connectDB(){}

// connectDB()

// -> Method 2 : use IFFY (iffy are starting by using ';' as sometimes if in previous line ';' is missed, it can cause errors)
// import express from "express"
// const app = express()
// ;(async()=>{
//     try {
//         await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
//         app.on("error",(error)=>{
//             console.log("App Error: ",error);
//             throw error
//         })

//         app.listen(process.env.PORT , ()=>{
//             console.log(`App is listening on Port: ${process.env.PORT}`);
//         })
//     } catch (error) {
//         console.error("Error: ",error)
//         throw err
//     }
// })()