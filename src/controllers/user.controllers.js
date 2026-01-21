import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.js";
import { uploadfile } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { response } from "express";
import jwt from "jsonwebtoken"
import {deleteCloudinaryAsset} from "../utils/deletefile.js"

const generateTokens = async (userId) => {
    try {
        const user =  await User.findById(userId)

        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
        user.refreshToken = refreshToken //storting refresh token in user 
        await user.save({validateBeforeSave : false}) // saving the user 
x
        return {accessToken , refreshToken}

    } catch (error) {
        throw new ApiError(500 , "Unable to generate tokens ")
    }
}

const registerUser = asyncHandler(async (req, res) => {
    // step 1
    const { fullName, email, userName, password } = req.body;
    console.log("email : ", email);
    console.log("name  : ", fullName);
    console.log("password : ", password);
    console.log("username  : ", userName);

    /* <<--------logic for user registration-------------->> 
        1 take input of all neccesary data 
        2 check validation - ki saara data aaya ki nhi 
        3 check existing username or email 
        4 check for images , check for avatar 
        5 upload them to cloudinary 
        6 create user object in db 
        7 remove password and refresh token from the response 
        8 check for user creation 
        9 return response 
    */

    if (
        [fullName, email, userName, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are compulsory ");
    }

    const existedUserName = await User.findOne({
        userName,
    });
    const existedEmail = await User.findOne({
        email,
    });

    /*
        what if i need to check the validity of more than one inputs at once then this is what i can do 
        const existedInput = User.findOne({
            $or : [{userName} , {email}]
        }) 
        now i will check validity if it exist or not 
        if(existedInput){
            throw new ApiError(409 , " information already exist please try new username or email to register")
        }
        */

    if (existedEmail) {
        throw new ApiError(
            409,
            "Account from this email already exist , Please login"
        );
    }
    if (existedUserName) {
        throw new ApiError(409, "UserName already exist , try something different");
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;  -- this method won't work and gives you undefined error when cover imageis not uploaded in an optional format

    let coverImageLocalPath;
    if (
        req.files &&
        Array.isArray(req.files.coverImage) &&
        req.files.coverImage.length > 0
    ) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required please upload");
    }

    // when we are using options like user might upload or not then we use another method to check

    // if(!coverImageLocalPath){
    //     throw new ApiError(400 ,"coverImaGE file is required please upload")
    // }

    const avatar = await uploadfile(avatarLocalPath);
    const coverImage = await uploadfile(coverImageLocalPath);

    // console.log(coverImage)

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required ");
    }

    // if(!coverImage){
    //     throw new ApiError(400 , "coverImage file is required ")
    // }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url,
        userName: userName.toLowerCase(),
        email,
        password,
    });

    const createduser = await User.findById(user._id).select(
        "-password -refreshToken"
    );
    if (!createduser) {
        throw new ApiError(500, "something went wrong while registering user");
    }

    return res
        .status(201)
        .json(new ApiResponse(200, createduser, "User registered succesfully "));
});

const loginUser = asyncHandler(async (req , res) => {
    /*
        req body -> data
        input email or username with password 
        check validation if the string is not empty 
        find the user using username or email 
        check the password 
        generate a access token and refresh token and send it to user
        send cookie 
    */  

    const {userName , email , password } = req.body 
    if(!(userName || email)){
        throw new ApiError(400 , "Please enter details")
    }

    const userValidity = User.findOne({
        $or : [{userName} , {email}]
    })

    if(!userValidity){
        throw new ApiError(400 , "User doesn't exist")
    }
    const isPasswordValid = await userValidity.isPasswordCorrect(password)
    if(!isPasswordValid){
        throw new ApiError(400 , "Password is Incorrect , try something different")
    }
    const {accessToken , refreshToken} = await generateTokens(userValidity._id)
    const loggedInUser = User.findById(userValidity._id).select("-password -refreshToken")
    const options = {
        httponly : true ,
        secure : true 
    }
    return res
    .status(200)
    .cookie("accessToken " , accessToken , options)
    .cookie("refreshToken" , refreshToken , options)
    .json(
        new ApiResponse(
            200,
            {
                user : loggedInUser , accessToken , refreshToken
            }, 
            "User Logged In succesfully "
        )
    )

})

const logOutUser = asyncHandler(async (req , res)=>{
    await User.findByIdAndUpdate(
        req.user._id, 
        {
            $set : {
                refreshToken : undefined
            }
        }, 
        {
                new : true 
        }
    )
    const options = {
        httponly : true ,
        secure : true 
    }
    return response
    .status(200)
    .clearCookie("accessToken" , options)
    .clearCookie("refreshToken" , options)
    .json(new ApiResponse(200 , {} , "User logout succesfully"))
})

const refreshAccessToken = asyncHandler(async (req , res) => {
    /*
        take incomning refresh token 
        validate incoming refresh token 
        decode incoming refresh token 
        find user using decoded token using findbyid 
        validate user 
        check incoming refresh token is same as the token which user already have 
        const generate access and refresh token 
        return response 
     */

    const incomingRefreshToken = req.cookie.refreshToken || req.body.refreshToken // we use req.body for app users when the user accesses from app it will send cookie
    if(!incomingRefreshToken){
        throw new ApiError(401 , "Unauthorized request")
    }
    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken, 
            process.env.REFRESH_TOKEN_SECRET
        )
        const user = await User.findById(decodedToken?._id)
        if(!user){
            throw new ApiError(400 , "Invalid refresh token")
        }
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401 , "Invalid or expired refresh token")
        }
        const {accessToken , newrefreshToken} = generateTokens(user._id)
        return res
            .status(200)
            .cookie("accessToken" , accessToken)
            .cookie("refreshToken" , newrefreshToken)
            .json(
                new ApiResponse(200 , {accessToken , refreshToken : newrefreshToken} , "access token recieved ")
            )
    } catch (error) {
        throw new ApiError(401 , error?.message || "invalid refresh token ")
    }
})

const changePassword = asyncHandler(async (req , res) => {
    const {oldPassword , confirmPassword , newPassword} = req.body
    
    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
    if(!isPasswordCorrect){
        throw new ApiError(400 , "You had entered wrong current password")
    }
    if(newPassword!==confirmPassword){
        throw new ApiError(400 , "Please enter same confirm password ")
    }
    user.password = newPassword
    await user.save({validateBeforeSave : false })
    return res
    .status(200)
    .json(new ApiResponse(200 , {} , "Password updated succesfully"   
    ))
})

const getCurrentUser = asyncHandler(async (req, res) => {
    return res
    .status(200)
    .json(new ApiResponse(
        200 , req.user , "User fetched successfully"
    ))
})
const updateAccountDetails = asyncHandler(async (req , res) => {
    const {fullName , email } = req.body ; 
    if(!fullName || !email){
        throw new ApiError(400 , "Please enter all required fields ")
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id ,
        {
            $set : {
                fullName ,
                email
            }
        }, 
        {
            new : true //this also helps to send the response of updated user 
        }
    ).select("-password")
    return res
    .status(200)
    .json(
        new ApiResponse(200 , user , "Account details updated succesfully ")
    )
})

const updateAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path 
    if(!avatarLocalPath){
        throw new ApiError(400 , "Avatar file is missing")
    }
    const avatar = await uploadfile(avatarLocalPath)
    if(!avatar.url){
        throw new ApiError(400 , "Failed to upload avatar on cloudinary")
    }
    const user = findByIdAndUpdate(
        req.user?._id,
        {
            $set : {
                avatar : avatar.url
            }
        },
        {
            new : true
        }
    ).select("-password")
    return res
    .status(200)
    .json(
        new ApiResponse(200 , user , "Avatar file changes succesfully ")
    )
})

const deleteAndUpdataAvatar = asyncHandler(async (req , res) => {
    //validate request 
    //fetch user 
    //validate if we get user or not 
    //fetch old avatar public id 
    //update new avatar - uplaod file on cloudinary and then save to db
    //call deletefile utility to delete old avatar 

    const newAvatarPath = req.file?.path
    if(!newAvatarPath){
        throw new ApiError(400  , "We need new avatar to update old avatar")
    }
    const user = await User.findById(req.user._id)
    if(!user){
        throw new ApiError(401 , "Unable to fetch User")
    }
    const oldAvatar = user.avatar?.public_id
    const newAvatar =  await uploadfile(newAvatarPath)
    if(!newAvatar){
        throw new ApiError(400 , "uploading avatar on cloudinary failed ")
    }
    user.avatar = newAvatar ,
    await user.save({validateBeforeSave : false})
    
    await deleteCloudinaryAsset(oldAvatar)
    if(oldAvatar){
        throw new ApiError(400 , "old avatar is not yet deleted")
    }
    return res
    .status(200)
    .json(
        new ApiResponse(200 , user , "avatar updated successfully ")
    )


    
})
const updatecoverImage = asyncHandler(async (req , res) => {
    const coverImageLocalPath = req.file?.path 
    if(!coverImageLocalPath){
        throw new ApiError(400 , "coverImage file is required")
    }
    const coverImage = await uploadfile(coverImageLocalPath)
    if(!coverImage.url){
        throw new ApiError(400 , "error when uploading coverImage on cloudinary ")
    }
    const user = findByIdAndUpdate(
        req.user?._id, 
        {
            $set : {
                coverImage : coverImage.url
            }
        }, 
        {
            new : true
        }
    ).select("-password")
    return res
    .status(200)
    .json(
        new ApiResponse(200 , user , "coverImage uploaded and changed succesfully")
    )
})

const channelProfile = asyncHandler(async (req , res ) => {
    const {userName} = req.params 
    if(!userName?.trim()){
        throw new ApiError(400 , "Unable to fetch userName")
    }
    const channel = User.aggregate([
        {
            $match : {
                userName : userName.toLowerCase() ,  
            }
        }, 
        {
            $lookup : {
                from : "subcriptions" , //this subscription comes form Subscription with small s and plural as we had studied earlier 
                localField : "_id" , 
                foreignField : "channel", 
                as : "subscribers"
            }            
        }, 
        {
            $lookup : {
                from : "subscriptions", 
                localField : "_id", 
                foreignField : "subscriber" , 
                as : "subscribedTo"
            }
        }, 
        {
            $addFields : {
                subscriberCount : {
                    $size : "$subscribers" //we uses extra dollar sign here bcz subscriber is a field and we always use $ sign before fields t
                } , 
                channelsSubscribedToCount : {
                    $size : "$subscribedTo"
                }, 
                isSubscribed : {
                    $cond : {
                        if : {$in : [req.user?._id , "$subscribers.subscriber"]}, 
                        then : true , 
                        else : false
                    }
                }
            }
        }, 
        {
            $project: {
                fullName: 1,
                userName: 1,
                subscriberCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1

            }
        }
    ])
    console.log(channel)
})
export { 
    registerUser,
    loginUser, 
    logOutUser, 
    refreshAccessToken, 
    changePassword, 
    getCurrentUser,
    updateAccountDetails, 
    updateAvatar, 
    deleteAndUpdataAvatar, 
    updatecoverImage, 
    channelProfile
};
