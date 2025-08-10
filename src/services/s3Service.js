const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const REGION = process.env.AWS_REGION;
const BUCKET_NAME = process.env.AWS_BUCKET_NAME;

const s3Client = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

/**
 * Generate a presigned URL for uploading a file to S3.
 * @param {string} key - The object key (path in the bucket).
 * @param {string} contentType - MIME type of the file.
 * @returns {string} presigned URL
 */
async function generateUploadURL(key, contentType) {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
    ACL: 'private' // or 'public-read' if you want public
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour expiry
  return url;
}

module.exports = { generateUploadURL };
