import { BASE_URL } from "@/store/slices/vendor/productSlice";
import axios from "axios";
import toast from 'react-hot-toast'

type UploadResourceType = "image" | "raw" | "video";

export async function uploadAsset(
  file: File,
  folder: string,
  resourceType: UploadResourceType = "image"
): Promise<string | null> {
  try {
    const { data } = await axios.get(
      `${BASE_URL}/v1/cloudinary/signature?folder=${folder}`
    );

    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", data.apiKey);
    formData.append("timestamp", data.timestamp);
    formData.append("signature", data.signature);
    formData.append("folder", data.folder);

    const uploadRes = await axios.post(
      `https://api.cloudinary.com/v1_1/${data.cloudName}/${resourceType}/upload`,
      formData
    );

    return uploadRes.data.secure_url;
  } catch {
    toast.error("File upload failed. Try again.");
    return null;
  }
}

export async function uploadImage(file: File, folder: string): Promise<string | null> {
  return uploadAsset(file, folder, "image");
}

export async function uploadFile(file: File, folder: string): Promise<string | null> {
  return uploadAsset(file, folder, "raw");
}
