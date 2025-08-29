const axios = require('axios');
const FormData = require('form-data');
const { AppError } = require('../errors/AppError');
const { getCompanyWhatsAppConfig } = require('./companies.controller');

/**
 * Upload + Send media directly from form-data (file upload)
 * @param {string} companyId
 * @param {string} to - recipient WhatsApp number (E.164 format)
 * @param {Buffer} fileBuffer - uploaded file
 * @param {string} fileName
 * @param {string} mimeType - file mime type (application/pdf, image/jpeg, etc.)
 * @param {string} caption - optional caption
 */
async function uploadAndSendMediaFromForm(
  companyId,
  to,
  fileBuffer,
  fileName,
  mimeType,
  caption
) {
  try {
    const { whatsappPhoneId, whatsappToken } = await getCompanyWhatsAppConfig(
      companyId
    );

    console.log('WhatsApp Config:', { whatsappPhoneId, whatsappToken });

    if (!whatsappPhoneId || !whatsappToken) {
      throw new AppError('WhatsApp credentials missing for company', 400);
    }

    // 1️⃣ Upload media
    const form = new FormData();
    form.append('file', fileBuffer, {
      filename: fileName,
      contentType: mimeType,
    });
    form.append('type', mimeType);
    form.append('messaging_product', 'whatsapp');

    const uploadUrl = `https://graph.facebook.com/v22.0/${whatsappPhoneId}/media`;
    const uploadRes = await axios.post(uploadUrl, form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${whatsappToken}`,
      },
    });

    const mediaId = uploadRes.data.id;
    if (!mediaId) throw new AppError('Failed to upload media', 500);

    // 2️⃣ Decide type (WhatsApp API expects document/image/video/audio)
    let waType = 'document';
    if (mimeType.startsWith('image/')) waType = 'image';
    else if (mimeType.startsWith('video/')) waType = 'video';
    else if (mimeType.startsWith('audio/')) waType = 'audio';
    else if (mimeType === 'application/pdf') waType = 'document';

    // 3️⃣ Send message
    const body = {
      messaging_product: 'whatsapp',
      to,
      type: waType,
    };

    body[waType] = { id: mediaId };
    if (caption) body[waType].caption = caption;
    if (waType === 'document') body[waType].filename = fileName;

    const sendUrl = `https://graph.facebook.com/v22.0/${whatsappPhoneId}/messages`;
    const sendRes = await axios.post(sendUrl, body, {
      headers: {
        Authorization: `Bearer ${whatsappToken}`,
        'Content-Type': 'application/json',
      },
    });

    return {
      upload: uploadRes.data,
      message: sendRes.data,
    };
  } catch (err) {
    console.error('WhatsApp Error:', err.response?.data || err.message);
    throw new AppError(err.response?.data?.error?.message || err.message, 500);
  }
}

module.exports = { uploadAndSendMediaFromForm };
