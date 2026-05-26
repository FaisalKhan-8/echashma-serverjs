const path = require('path')
const { randomUUID } = require('crypto')
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3')

const IMAGE_MIME_EXT = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/webp': '.webp',
  'application/pdf': '.pdf'
}

function getS3Client() {
  const region = process.env.AWS_REGION
  if (!region) {
    throw new Error('AWS_REGION is not set')
  }
  return new S3Client({
    region,
    credentials:
      process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
        ? {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
          }
        : undefined
  })
}

/**
 * Base URL for objects in a public (or CloudFront) bucket.
 * Set AWS_S3_PUBLIC_BASE_URL to override, e.g. https://cdn.example.com
 */
function getPublicBaseUrl() {
  const custom = process.env.AWS_S3_PUBLIC_BASE_URL
  if (custom) {
    return custom.replace(/\/$/, '')
  }
  const bucket = process.env.AWS_BUCKET_NAME
  const region = process.env.AWS_REGION
  if (!bucket) {
    throw new Error('AWS_BUCKET_NAME is not set')
  }
  return `https://${bucket}.s3.${region}.amazonaws.com`
}

function sanitizeBaseName(name) {
  const base = path.basename(name || 'file')
  return base.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80) || 'file'
}

function extensionFromMime(mimetype, originalName) {
  if (mimetype && IMAGE_MIME_EXT[mimetype]) {
    return IMAGE_MIME_EXT[mimetype]
  }
  const ext = path.extname(originalName || '')
  return ext || ''
}

/**
 * Upload a buffer to S3. Returns the object key and public URL.
 * For public buckets, rely on bucket policy; optional ACL when AWS_S3_OBJECT_ACL=public-read.
 *
 * @param {object} opts
 * @param {Buffer} opts.body
 * @param {string} opts.folder - key prefix, no leading slash (e.g. kyc/12)
 * @param {string} [opts.originalName]
 * @param {string} [opts.contentType]
 */
async function uploadPublicObject({
  body,
  folder,
  originalName,
  contentType
}) {
  const bucket = process.env.AWS_BUCKET_NAME
  if (!bucket) {
    throw new Error('AWS_BUCKET_NAME is not set')
  }

  const ext = extensionFromMime(contentType, originalName)
  const safe = sanitizeBaseName(originalName)
  const key = `${folder.replace(/\/$/, '')}/${randomUUID()}-${safe}${ext}`

  const client = getS3Client()
  const input = {
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType || 'application/octet-stream'
  }
  if (process.env.AWS_S3_OBJECT_ACL === 'public-read') {
    input.ACL = 'public-read'
  }

  await client.send(new PutObjectCommand(input))

  const url = `${getPublicBaseUrl()}/${key}`
  return { key, url }
}

/**
 * Upload a Multer memory-stored file ({ buffer, originalname, mimetype }) to S3.
 * @returns {Promise<string|null>} public URL or null if no file/buffer
 */
async function uploadMulterFile(file, folder) {
  if (!file?.buffer?.length) return null
  const { url } = await uploadPublicObject({
    body: file.buffer,
    folder,
    originalName: file.originalname,
    contentType: file.mimetype
  })
  return url
}

module.exports = {
  getS3Client,
  getPublicBaseUrl,
  uploadPublicObject,
  uploadMulterFile,
  IMAGE_MIME_EXT
}
