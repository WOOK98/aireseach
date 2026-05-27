import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl as getSignedUrlCommand } from "@aws-sdk/s3-request-presigner";

import { s3 } from "./sdk";

import type { GetObjectUrlInput } from "../../lib/schema";
import type { StorageProviderStrategy } from "../types";

export const strategy = {
  getUploadUrl: async ({ path, bucket }: GetObjectUrlInput) => {
    const url = await getSignedUrlCommand(
      s3(),
      new PutObjectCommand({
        Bucket: bucket,
        Key: path,
      }),
      {
        expiresIn: 60,
      },
    );

    return { url };
  },
  getSignedUrl: async ({ path, bucket }: GetObjectUrlInput) => {
    const url = await getSignedUrlCommand(
      s3(),
      new GetObjectCommand({
        Bucket: bucket,
        Key: path,
      }),
      {
        expiresIn: 3600,
      },
    );

    return { url };
  },
  getPublicUrl: async ({ path, bucket }: GetObjectUrlInput) => {
    const endpoint = await s3().config.endpoint?.();

    if (endpoint?.hostname.includes("supabase.co")) {
      return {
        url: `${endpoint.protocol}//${endpoint.hostname}/storage/v1/object/public/${bucket}/${path}`,
      };
    }

    return {
      url: `${endpoint?.protocol}//${bucket}.${endpoint?.hostname}/${path}`,
    };
  },
  getDeleteUrl: async ({ path, bucket }: GetObjectUrlInput) => {
    const url = await getSignedUrlCommand(
      s3(),
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: path,
      }),
      {
        expiresIn: 60,
      },
    );

    return { url };
  },
} satisfies StorageProviderStrategy;
