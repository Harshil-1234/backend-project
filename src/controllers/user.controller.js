import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import {User} from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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

export {registerUser}