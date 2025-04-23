import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import {User} from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"

const generateAccessAndRefreshTokens = async (userId) => {    
    try {
        const user = await User.findById(userId)
        // console.log(user);
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken

        await user.save({ validateBeforeSave : false })

        return {
            accessToken, refreshToken
        }

    } catch (error) {
        console.log(error);
        throw new ApiError(500, "Something went wrong while generating refresh and access token")
    }
}

const registerUser = asyncHandler(async (req,res)=>{
    // 1. getting user details from frontend (if from form or json use req.body())
    const {fullName,email,username,password} = req.body
    // console.log(fullName,email);
    
    //2. Validating if fields empty or not
    if([fullName,email,username,password].some((field)=>field?.trim() === "")){
        throw new ApiError(400,"All Fields are required")
    }

    //3. Check if user already exists
    const existingUser = await User.findOne({
        $or: [{ username },{ email }]
    })
    if(existingUser){
        throw new ApiError(409,"User with same username or email already exists")
    }

    //4. Check for images and avatars
    //req.files access given by multer
    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0){
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    // console.log(req.files)

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar File is required")
    }

    //5. Upload them to cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(400,"Avatar File is required")
    }

    //6. Enter user in DB, remove pass and refresh token and check for user creation
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase(),
    })

    //.select() by default selects everything, text written in string with '-' sign removes those fields
    const isUserCreated = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!isUserCreated){
        throw new ApiError(500,"User not registered!! Server Error")
    }

    //7. Return response
    return res.status(201).json(
        new ApiResponse(200,isUserCreated,"User Registered Successfully")
    )

})

const loginUser = asyncHandler(async (req,res) => {
    // 1. Input user details -> validate if username or password empty
    const {email,username,password} = req.body

    if(!username && !email){
        throw new ApiError(400,"Username or email is required")
    }

    // 2. Check if user already exists else need new register
    const user = await User.findOne({
        $or: [{email},{username}],
    })

    if(!user){
        throw new ApiError(404,"User doesnot exist")
    }
    
    // 3. if exist check whether password is correct or not
    const isPasswordValid = await user.isPasswordCorrect(password)
    if(!isPasswordValid){
        throw new ApiError(404,"Incorrect password")
    }

    // 4. access and refresh token generate and send to user
    const {accessToken,refreshToken} = await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken") //optional step

    // 5. send token in cookies
    const options = {
        httpOnly : true,
        secure : true
    }

    // 6. send a response for successfull login
    return res.status(200).cookie("accessToken",accessToken,options)
                          .cookie("refreshToken",refreshToken,options)
                          .json(new ApiResponse(200,
                                {user: loggedInUser,accessToken,refreshToken},
                                "User logged in successfully"
                            ))

})

const logoutUser = asyncHandler(async (req,res) => {
    const user = await User.findByIdAndUpdate(
                                req.user._id,
                                {
                                    $set: {
                                        refreshToken: undefined,
                                    }
                                },
                                {
                                    new: true
                                }
                            )

    const options = {
        httpOnly : true,
        secure : true
    }

    return res
        .status(200)
        .clearCookie("accessToken",options)
        .clearCookie("refreshToken",options)
        .json(new ApiResponse(200, {}, "User logged out successfully"))
})

const refreshAccessToken = asyncHandler(async (req,res) => {
    try {
        const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    
        if(!incomingRefreshToken){
            throw new ApiError(401, "Unauthorized request")
        }
    
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET,
        )
    
        const user = await User.findById(decodedToken?._id)
    
        if(!user){
            throw new ApiError(401, "Invalid Refresh Token")
        }
    
        if(incomingRefreshToken !== user.refreshToken){
            throw new ApiError(401, "Refresh Token is expired or used")
        }
    
        const options = {
            httpOnly : true,
            secure : true
        }
    
        const {accessToken , newrefreshToken} = await generateAccessAndRefreshTokens(user._id)
    
        return res
        .status(201)
        .cookie("accessToken",accessToken)
        .cookie("refreshToken",newrefreshToken)
        .json(
            new ApiResponse(
                200,
                {
                    accessToken,
                    refreshToken : newrefreshToken,
                },
                "Access Token refreshed successfully"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Refresh Token")
    }

})

export {registerUser,loginUser,logoutUser,refreshAccessToken}