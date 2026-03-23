import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ENV } from './_core/env';

function getR2Client(): S3Client {
  const accountId = ENV.r2AccountId;
  const accessKeyId = ENV.r2AccessKeyId;
  const secretAccessKey = ENV.r2SecretAccessKey;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("R2 credentials missing: set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY");
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const client = getR2Client();
  const bucket = ENV.r2BucketName ?? "inteira-media";
  const publicUrl = ENV.r2PublicUrl;

  const body = typeof data === "string" ? Buffer.from(data, "base64") : data;

  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: relKey,
    Body: body,
    ContentType: contentType,
  }));

  const url = publicUrl
    ? `${publicUrl.replace(/\/+$/, "")}/${relKey}`
    : `https://${bucket}.r2.cloudflarestorage.com/${relKey}`;

  return { key: relKey, url };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const client = getR2Client();
  const bucket = ENV.r2BucketName ?? "inteira-media";
  const publicUrl = ENV.r2PublicUrl;

  if (publicUrl) {
    return { key: relKey, url: `${publicUrl.replace(/\/+$/, "")}/${relKey}` };
  }

  const url = await getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: relKey }), { expiresIn: 3600 });
  return { key: relKey, url };
}
