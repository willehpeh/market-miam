export interface CloudinaryUploadParams {
  timestamp: number;
  public_id: string;
  asset_folder?: string;
  overwrite: boolean;
  invalidate: boolean;
  allowed_formats: string;
  transformation: string;
  eager: string;
}

export interface CloudinarySignedUpload {
  cloudName: string;
  apiKey: string;
  signature: string;
  params: CloudinaryUploadParams;
}

export abstract class SignedUploads {
  abstract for(publicId: string): CloudinarySignedUpload;
}
