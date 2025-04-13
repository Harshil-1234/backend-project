import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app = express()

// To handle cross origin errors when communicating between frontend and server
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

// Configuration when handling json data
app.use(express.json({
    limit: "16kb"
}))


app.use(express.urlencoded({extended: true, limit:"16kb"}))

app.use(express.static("public"))

app.use(cookieParser())

export {app}