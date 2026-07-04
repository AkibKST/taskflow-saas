import fs from "fs/promises";
import path from "path";
import { envVars } from "../config/env";

/**
 * Pluggable blob storage for task attachments.
 * - `local` (default): writes under STORAGE_LOCAL_DIR — zero-config for dev / a
 *   single box with a persistent volume.
 * - `s3`: any S3-compatible bucket via the AWS SDK (an OPTIONAL dependency,
 *   loaded lazily so the server runs without it while on local storage).
 */
export interface StoredObject {
  key: string;
}

export interface Storage {
  put(key: string, body: Buffer, contentType: string): Promise<StoredObject>;
  get(key: string): Promise<Buffer>;
  remove(key: string): Promise<void>;
  /** Public/pre-signed URL if the backend supports it (S3); null for local. */
  url(key: string): Promise<string | null>;
}

const localRoot = path.resolve(process.cwd(), envVars.STORAGE_LOCAL_DIR);

const localStorage: Storage = {
  async put(key, body) {
    const full = path.join(localRoot, key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, body);
    return { key };
  },
  async get(key) {
    return fs.readFile(path.join(localRoot, key));
  },
  async remove(key) {
    await fs.rm(path.join(localRoot, key), { force: true });
  },
  async url() {
    return null; // served through the API download route
  },
};

let s3Client: any;
const getS3 = () => {
  if (!s3Client) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { S3Client } = require("@aws-sdk/client-s3");
    s3Client = new S3Client({
      region: envVars.S3_REGION,
      endpoint: envVars.S3_ENDPOINT,
      credentials:
        envVars.S3_ACCESS_KEY_ID && envVars.S3_SECRET_ACCESS_KEY
          ? {
              accessKeyId: envVars.S3_ACCESS_KEY_ID,
              secretAccessKey: envVars.S3_SECRET_ACCESS_KEY,
            }
          : undefined,
    });
  }
  return s3Client;
};

const streamToBuffer = async (stream: any): Promise<Buffer> => {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
};

const s3Storage: Storage = {
  async put(key, body, contentType) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PutObjectCommand } = require("@aws-sdk/client-s3");
    await getS3().send(
      new PutObjectCommand({
        Bucket: envVars.S3_BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
      })
    );
    return { key };
  },
  async get(key) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { GetObjectCommand } = require("@aws-sdk/client-s3");
    const res = await getS3().send(
      new GetObjectCommand({ Bucket: envVars.S3_BUCKET, Key: key })
    );
    return streamToBuffer(res.Body);
  },
  async remove(key) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { DeleteObjectCommand } = require("@aws-sdk/client-s3");
    await getS3().send(
      new DeleteObjectCommand({ Bucket: envVars.S3_BUCKET, Key: key })
    );
  },
  async url(key) {
    return envVars.S3_PUBLIC_URL ? `${envVars.S3_PUBLIC_URL}/${key}` : null;
  },
};

export const storage: Storage =
  envVars.STORAGE_DRIVER === "s3" ? s3Storage : localStorage;
