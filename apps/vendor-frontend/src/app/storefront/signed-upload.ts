export interface SignedParams {
  timestamp: number;
  public_id: string;
  overwrite: boolean;
  invalidate: boolean;
  allowed_formats: string;
  transformation: string;
  eager: string;
}

export interface SignedUpload {
  cloudName: string;
  apiKey: string;
  signature: string;
  params: SignedParams;
}
