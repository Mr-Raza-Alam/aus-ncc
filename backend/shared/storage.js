const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} = require('@aws-sdk/client-s3');

let s3;

function getClient() {
  if (!s3) {
    s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return s3;
}

/**
 * Uploads a file buffer to Cloudflare R2 and returns the public URL.
 * Falls back to base64 Data URL if R2 credentials are not set in development.
 * @param {Buffer} fileBuffer
 * @param {string} key  — object key (e.g. "attendance/sessions/photo_xyz.jpg")
 * @param {string} contentType — MIME type
 * @returns {Promise<string>} public URL or Data URL
 */
async function uploadFile(fileBuffer, key, contentType = 'image/jpeg') {
  if (
    !process.env.R2_ACCOUNT_ID ||
    !process.env.R2_ACCESS_KEY_ID ||
    process.env.R2_ACCOUNT_ID === 'your_account_id'
  ) {
    // In local dev without R2 credentials, encode as Data URI so uploads never crash
    const b64 = fileBuffer.toString('base64');
    return `data:${contentType};base64,${b64}`;
  }

  const client = getClient();
  await client.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
    })
  );

  const publicBase = process.env.R2_PUBLIC_URL || 'https://assets.ausncc.in';
  return `${publicBase.replace(/\/$/, '')}/${key}`;
}

/**
 * Deletes an object from R2.
 * @param {string} key
 */
async function deleteFile(key) {
  if (
    !process.env.R2_ACCOUNT_ID ||
    !process.env.R2_ACCESS_KEY_ID ||
    process.env.R2_ACCOUNT_ID === 'your_account_id'
  ) {
    return;
  }

  const client = getClient();
  await client.send(
    new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
    })
  );
}

module.exports = { uploadFile, deleteFile };
