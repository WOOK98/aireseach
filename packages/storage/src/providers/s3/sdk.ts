import { S3Client } from "@aws-sdk/client-s3";

import { env } from "../../env";

let s3Instance: S3Client | null = null;

export const s3 = () => {
  s3Instance ??= new S3Client({
    forcePathStyle: true,
    region: env.S3_REGION,
    endpoint: env.S3_ENDPOINT,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
  });

  return s3Instance;
};
