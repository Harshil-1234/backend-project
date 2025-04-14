import { v2 as cloudinary } from 'cloudinary';
import fs from "fs"

// Configuration
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) {
            return null
        }
        //upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath,{
            resource_type: 'auto'
        })

        //file has been uploaded successfully
        console.log("File uploaded on Cloundinary\n",response.url);

        return response
        
    } catch (error) {
        //remove the file from locally saved temp file as upload operation got failed
        fs.unlinkSync(localFilePath)
        return null
    }
}

export {uploadOnCloudinary}