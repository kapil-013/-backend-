import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadfile } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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

export { registerUser };
