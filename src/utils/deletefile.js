/*
    how to create a utility which help to delete file from database 
    find the path of file which i need to delete
    crete a deletefile function 

*/

import { v2 as cloudinary } from "cloudinary";

export const deleteCloudinaryAsset = async (avatarpublicId) => {
  if (!avatarpublicId) return;

  try {
    await cloudinary.uploader.destroy(avatarpublicId);
  } catch (error) {
    console.error("Cloudinary delete failed:", error.message);
  }
};
