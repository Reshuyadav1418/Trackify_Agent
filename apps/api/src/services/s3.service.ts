import { S3Client, PutObjectCommand, GetObjectCommand, HeadBucketCommand, CreateBucketCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const bucket = process.env.S3_BUCKET || 'trackify-screenshots';

export const s3Client = new S3Client({
  region: process.env.S3_REGION || 'us-east-1',
  endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || 'minioadmin',
    secretAccessKey: process.env.S3_SECRET_KEY || 'minioadmin',
  },
  forcePathStyle: true,
});

let bucketEnsured = false;
export const ensureBucketExists = async (): Promise<void> => {
  if (bucketEnsured) return;
  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: bucket }));
    bucketEnsured = true;
  } catch {
    try {
      await s3Client.send(new CreateBucketCommand({ Bucket: bucket }));
      console.log(`[S3] Created bucket: ${bucket}`);
      bucketEnsured = true;
    } catch (createErr: any) {
      console.warn(`[S3] Ensure bucket notice:`, createErr.message || createErr);
    }
  }
};

export const getPresignedUploadUrl = async (s3Key: string, expiresInSeconds = 900): Promise<string> => {
  await ensureBucketExists();
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: s3Key,
    ContentType: 'image/jpeg',
  });
  return getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
};

export const getPresignedDownloadUrl = async (s3Key: string, expiresInSeconds = 900): Promise<string> => {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: s3Key,
  });
  return getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
};

export const uploadToS3Direct = async (s3Key: string, buffer: Buffer, contentType = 'image/jpeg'): Promise<void> => {
  await ensureBucketExists();
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: s3Key,
    Body: buffer,
    ContentType: contentType,
  });
  await s3Client.send(command);
};

export const getS3ObjectStream = async (s3Key: string): Promise<any> => {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: s3Key,
  });
  const res = await s3Client.send(command);
  return res.Body;
};

