import { strategy } from "./providers";

export const { getUploadUrl, getDeleteUrl, getPublicUrl, getSignedUrl } =
  strategy;
export * from "./lib/schema";
