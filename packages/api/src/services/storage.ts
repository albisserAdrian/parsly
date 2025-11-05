import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export interface Storage {
  upload(key: string, body: Buffer, contentType: string): Promise<void>;
  getSignedUrl(key: string, expiresIn?: number): Promise<string>;
}

export function createStorage(): Storage {
  const s3Client = new S3Client({
    region: process.env.AWS_REGION || "us-east-1",
    endpoint: process.env.S3_ENDPOINT || "http://localhost:9000",
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY || "minioadmin",
      secretAccessKey: process.env.S3_SECRET_KEY || "minioadmin",
    },
    forcePathStyle: true,
  });

  const bucket = process.env.S3_BUCKET || "parsely";

  return {
    async upload(key: string, body: Buffer, contentType: string) {
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      });

      await s3Client.send(command);
    },

    async getSignedUrl(key: string, expiresIn = 3600) {
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      return getSignedUrl(s3Client, command, { expiresIn });
    },
  };
}
