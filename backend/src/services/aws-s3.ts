import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { fromInstanceMetadata } from '@aws-sdk/credential-providers';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const credentials = fromInstanceMetadata();

export const s3 = new S3Client({
  region: 'eu-north-1',
  credentials
});

let loggedCaller = false;
export async function logAwsCallerOnce(): Promise<void> {
  if (loggedCaller) return;
  try {
    const sts = new STSClient({ region: 'eu-north-1', credentials });
    const ident = await sts.send(new GetCallerIdentityCommand({}));
    console.log('[PRESIGN] caller:', ident?.Arn || ident);
  } catch (e) {
    console.warn('[PRESIGN] caller log failed:', e instanceof Error ? e.message : String(e));
  }
  loggedCaller = true;
}

export async function presignPutObject(params: {
  bucket: string;
  key: string;
  contentType: string;
  expiresIn?: number;
}): Promise<string> {
  const cmd = new PutObjectCommand({
    Bucket: params.bucket,
    Key: params.key,
    ContentType: params.contentType
  });
  const url = await getSignedUrl(s3, cmd, { expiresIn: params.expiresIn ?? 600 });
  return url;
}


