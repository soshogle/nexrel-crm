import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

interface UploadParams {
  key: string;
  body: Buffer;
  contentType: string;
}

function getS3Client() {
  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!region || !accessKeyId || !secretAccessKey) {
    return null;
  }

  const endpoint = process.env.AWS_S3_ENDPOINT || undefined;
  const forcePathStyle = !!endpoint;

  return new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
    endpoint,
    forcePathStyle,
  });
}

export async function uploadToS3({ key, body, contentType }: UploadParams) {
  const bucket = process.env.AWS_S3_BUCKET;
  if (!bucket) {
    throw new Error("AWS_S3_BUCKET is not configured");
  }

  const client = getS3Client();
  if (!client) {
    throw new Error("AWS S3 credentials are not configured");
  }

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      ACL: "public-read",
    })
  );

  const publicBase = process.env.AWS_S3_PUBLIC_URL;
  if (publicBase) {
    return `${publicBase.replace(/\/$/, "")}/${key}`;
  }

  const region = process.env.AWS_REGION;
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}
