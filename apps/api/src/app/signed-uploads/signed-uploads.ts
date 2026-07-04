export interface SignedParams {
  timestamp: number;
  public_id: string;
  overwrite: boolean;
  invalidate: boolean;
  allowed_formats: string;
  transformation: string;
}

export interface SignedUpload {
  cloudName: string;
  apiKey: string;
  signature: string;
  params: SignedParams;
}

export abstract class SignedUploads {
  abstract for(publicId: string): SignedUpload;
}
