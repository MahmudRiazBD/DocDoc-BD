import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

// Memoized S3 client
let s3Client: S3Client | null = null;

const getS3Client = (): S3Client => {
  if (s3Client) {
    return s3Client;
  }

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('Cloudflare R2 access credentials (ACCOUNT_ID, ACCESS_KEY_ID, SECRET_ACCESS_KEY) are not configured.');
  }

  s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return s3Client;
}


export const uploadFileToR2 = async (file: File): Promise<string> => {
  const bucketName = process.env.R2_BUCKET_NAME;
  const publicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;

  if (!bucketName || !publicUrl) {
    throw new Error('Cloudflare R2 bucket configuration (R2_BUCKET_NAME, NEXT_PUBLIC_R2_PUBLIC_URL) is missing.');
  }
  
  const s3 = getS3Client();
  const fileExtension = file.name.split('.').pop();
  const fileName = `${uuidv4()}.${fileExtension}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  await s3.send(new PutObjectCommand({
    Bucket: bucketName,
    Key: fileName,
    Body: buffer,
    ContentType: file.type,
  }));

  return `${publicUrl}/${fileName}`;
};
