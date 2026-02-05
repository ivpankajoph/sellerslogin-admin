import { BASE_URL } from "@/store/slices/vendor/productSlice";
import axios from "axios";
import toast from 'react-hot-toast'

export async function uploadImage(file: File, folder: string): Promise<string | null> {
  try {
    // Step 1: Request signature for chosen folder
    const { data } = await axios.get(
      `${BASE_URL}/v1/cloudinary/signature?folder=${folder}`
    );

    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", data.apiKey);
    formData.append("timestamp", data.timestamp);
    formData.append("signature", data.signature);
    formData.append("folder", data.folder); // important

    // Step 2: Upload to Cloudinary
    const uploadRes = await axios.post(
      `https://api.cloudinary.com/v1_1/${data.cloudName}/image/upload`,
      formData
    );

    return uploadRes.data.secure_url;
  } catch {
    toast.error("Image upload failed. Try again.");
    return null;
  }
}
