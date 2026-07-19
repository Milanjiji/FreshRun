/**
 * uploadImage.ts
 *
 * Shared utility for uploading images to Cloudinary through the backend.
 * The backend signs the upload request so Cloudinary credentials never
 * appear in the client bundle.
 *
 * Flow:
 *   1. POST /upload/sign  → backend returns { signature, timestamp, api_key, cloud_name, folder }
 *   2. POST to Cloudinary with the signed params  → returns { secure_url }
 */

import api from './api';

interface SignedUploadParams {
  signature: string;
  timestamp: number;
  api_key: string;
  cloud_name: string;
  folder?: string;
}

/**
 * Upload a local image file to Cloudinary via a backend-signed request.
 *
 * @param asset - Image asset from react-native-image-picker (has .uri, .type, .fileName)
 * @param folder - Cloudinary folder name, e.g. 'help-tickets' or 'ticket-replies'
 * @returns The public secure_url of the uploaded image
 */
export const uploadImage = async (
  asset: { uri: string; type?: string; fileName?: string },
  folder: string = 'support',
): Promise<string> => {
  // Step 1: Get a signed upload authorisation from the backend
  const signRes = await api.post<SignedUploadParams>('/upload/sign', { folder });
  const { signature, timestamp, api_key, cloud_name } = signRes.data;

  // Step 2: Build the multipart form
  const formData = new FormData();
  formData.append('file', {
    uri: asset.uri,
    type: asset.type || 'image/jpeg',
    name: asset.fileName || 'upload.jpg',
  } as any);
  formData.append('signature', signature);
  formData.append('timestamp', String(timestamp));
  formData.append('api_key', api_key);
  if (folder) {
    formData.append('folder', folder);
  }

  // Step 3: Upload directly to Cloudinary using the signed params
  const uploadRes = await fetch(
    `https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`,
    {
      method: 'POST',
      body: formData,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'multipart/form-data',
      },
    },
  );

  const resData = await uploadRes.json();

  if (!resData.secure_url) {
    throw new Error(resData.error?.message || 'Cloudinary upload failed — no secure_url returned.');
  }

  return resData.secure_url;
};
