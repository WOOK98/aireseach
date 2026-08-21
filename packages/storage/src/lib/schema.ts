import * as z from "zod";

import { env } from "../env";

export const getObjectUrlSchema = z.object({
  path: z.string(),
  bucket: z
    .string()
    .optional()
    .default(env.S3_BUCKET ?? ""),
  /**
   * Optional MIME pin for presigned PUT uploads. When set, the signed URL
   * carries `ContentType` and S3 rejects PUTs whose Content-Type header
   * does not match — enforcing upload whitelists at the storage boundary,
   * not just in the API layer.
   */
  contentType: z.string().optional(),
});

export type GetObjectUrlInput = z.input<typeof getObjectUrlSchema>;
