const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

// Configure AWS SDK
const s3Config = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
  signatureVersion: 'v4'
};

// Add endpoint for S3-compatible storage if provided
if (process.env.S3_ENDPOINT) {
  s3Config.endpoint = process.env.S3_ENDPOINT;
  s3Config.s3ForcePathStyle = process.env.S3_FORCE_PATH_STYLE === 'true';
}

const s3 = new AWS.S3(s3Config);

// Generate unique file key for S3
const generateFileKey = (fileName) => {
  const extension = fileName.split('.').pop();
  const uniqueId = uuidv4();
  return `documents/${uniqueId}.${extension}`;
};

// Upload file to S3
const uploadToS3 = async (fileBuffer, fileName, fileType) => {
  const key = generateFileKey(fileName);
  const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
    Body: fileBuffer,
    ContentType: fileType,
    ACL: 'private' // Set to 'public-read' if you want public access
  };

  try {
    const data = await s3.upload(params).promise();
    return {
      key: data.Key,
      location: data.Location,
      bucket: data.Bucket,
      etag: data.ETag
    };
  } catch (error) {
    console.error('S3 Upload Error:', error);
    throw new Error('Failed to upload file to S3');
  }
};

// Get signed URL for downloading
const getSignedUrl = async (key, fileName, expiresIn = 3600) => {
  const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
    ResponseContentDisposition: `attachment; filename="${fileName}"`,
    Expires: expiresIn
  };

  try {
    const url = await s3.getSignedUrlPromise('getObject', params);
    return url;
  } catch (error) {
    console.error('S3 Signed URL Error:', error);
    throw new Error('Failed to generate download URL');
  }
};

// Delete file from S3
const deleteFromS3 = async (key) => {
  const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key
  };

  try {
    await s3.deleteObject(params).promise();
    return true;
  } catch (error) {
    console.error('S3 Delete Error:', error);
    throw new Error('Failed to delete file from S3');
  }
};

// Check if file exists in S3
const checkFileExists = async (key) => {
  const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key
  };

  try {
    await s3.headObject(params).promise();
    return true;
  } catch (error) {
    if (error.code === 'NotFound') {
      return false;
    }
    throw error;
  }
};

module.exports = {
  s3,
  uploadToS3,
  getSignedUrl,
  deleteFromS3,
  checkFileExists,
  generateFileKey
};