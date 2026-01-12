// method 1
// const asyncHandler = (fn)=>async(req , res, next )=>{
//     try {
//         await fn(req , res , next )
//     } catch (error) {
//         res.status(err.code || 500).json({
//             success : false ,
//             message : err.message
//         })
//     }
// }





// method 2 using promises

const asyncHandler = (requestHandler) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
};





export { asyncHandler };
