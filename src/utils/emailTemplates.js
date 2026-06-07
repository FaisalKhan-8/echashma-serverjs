const OTP_EXPIRY_MINUTES = 10

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function frontendBaseUrl() {
  return (process.env.FRONTEND_URL || 'https://echashma.com').replace(/\/$/, '')
}

function emailLayout({ preheader, bodyHtml, footerNote }) {
  const baseUrl = frontendBaseUrl()
  const termsUrl = `${baseUrl}/terms-and-conditions`
  const privacyUrl = `${baseUrl}/privacy-policy`
  const year = new Date().getFullYear()

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>E-chashma</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #f0f4f8; }
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; }
      .content-padding { padding: 28px 20px !important; }
      .otp-code { font-size: 28px !important; letter-spacing: 6px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f0f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f0f4f8;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" class="email-container" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;">
          <!-- Header -->
          <tr>
            <td align="center" style="padding:0 0 24px 0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="background:linear-gradient(135deg,#0f766e 0%,#14b8a6 100%);background-color:#0f766e;border-radius:12px;padding:14px 28px;">
                    <span style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:0.5px;">E-chashma</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Main card -->
          <tr>
            <td style="background-color:#ffffff;border-radius:16px;box-shadow:0 4px 24px rgba(15,118,110,0.08);overflow:hidden;">
              ${bodyHtml}
            </td>
          </tr>
          <!-- Terms & footer -->
          <tr>
            <td class="content-padding" style="padding:28px 32px 0 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 10px 0;font-size:13px;font-weight:600;color:#334155;letter-spacing:0.3px;">Terms &amp; Conditions</p>
                    <p style="margin:0 0 12px 0;font-size:12px;line-height:1.6;color:#64748b;">
                      By verifying your company email, you confirm that you are an authorised representative of the registered business
                      and agree to E-chashma&apos;s
                      <a href="${termsUrl}" style="color:#0f766e;text-decoration:underline;">Terms &amp; Conditions</a>
                      and
                      <a href="${privacyUrl}" style="color:#0f766e;text-decoration:underline;">Privacy Policy</a>.
                      Do not share this OTP with anyone. E-chashma staff will never ask for your verification code.
                    </p>
                    <p style="margin:0;font-size:11px;line-height:1.5;color:#94a3b8;">
                      ${footerNote}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:24px 32px 8px 32px;">
              <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.5;">
                &copy; ${year} E-chashma. All rights reserved.<br />
                <a href="${baseUrl}" style="color:#0f766e;text-decoration:none;">${baseUrl.replace(/^https?:\/\//, '')}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function buildEmailVerificationOtpHtml({ otp, companyName, recipientEmail }) {
  const safeCompanyName = companyName ? escapeHtml(companyName) : ''
  const maskedEmail = escapeHtml(
    recipientEmail.replace(/^(.{2})(.*)(@.*)$/, (_, a, b, c) => {
      return a + '*'.repeat(Math.min(b.length, 6)) + c
    })
  )

  const bodyHtml = `
    <!-- Accent bar -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
      <tr>
        <td style="height:4px;background:linear-gradient(90deg,#0f766e,#14b8a6,#2dd4bf);background-color:#0f766e;font-size:0;line-height:0;">&nbsp;</td>
      </tr>
    </table>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
      <tr>
        <td class="content-padding" style="padding:36px 40px 32px 40px;">
          <!-- Icon badge -->
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto 20px auto;">
            <tr>
              <td align="center" style="width:56px;height:56px;background-color:#ecfdf5;border-radius:50%;font-size:26px;line-height:56px;text-align:center;">
                &#9993;
              </td>
            </tr>
          </table>
          <h1 style="margin:0 0 8px 0;font-size:24px;font-weight:700;color:#0f172a;text-align:center;line-height:1.3;">
            Verify your company email
          </h1>
          <p style="margin:0 0 28px 0;font-size:15px;line-height:1.6;color:#64748b;text-align:center;">
            Hi${safeCompanyName ? ` <strong style="color:#334155;">${safeCompanyName}</strong>` : ''}, enter the code below to confirm
            <strong style="color:#334155;">${maskedEmail}</strong> on E-chashma.
          </p>
          <!-- OTP box -->
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px 0;">
            <tr>
              <td align="center" style="background-color:#f0fdfa;border:2px dashed #99f6e4;border-radius:12px;padding:24px 16px;">
                <p style="margin:0 0 6px 0;font-size:11px;font-weight:600;color:#0f766e;text-transform:uppercase;letter-spacing:1.5px;">
                  Your verification code
                </p>
                <p class="otp-code" style="margin:0;font-size:36px;font-weight:800;color:#0f766e;letter-spacing:10px;font-family:'Courier New',Courier,monospace;">
                  ${otp}
                </p>
              </td>
            </tr>
          </table>
          <!-- Expiry notice -->
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 20px 0;">
            <tr>
              <td style="background-color:#fffbeb;border-left:4px solid #f59e0b;border-radius:0 8px 8px 0;padding:14px 16px;">
                <p style="margin:0;font-size:13px;line-height:1.5;color:#92400e;">
                  <strong>Expires in ${OTP_EXPIRY_MINUTES} minutes.</strong>
                  For your security, this code can only be used once.
                </p>
              </td>
            </tr>
          </table>
          <!-- Steps -->
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td style="padding:16px 0 0 0;border-top:1px solid #f1f5f9;">
                <p style="margin:0 0 12px 0;font-size:13px;font-weight:600;color:#334155;">What to do next</p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="padding:6px 0;font-size:13px;line-height:1.5;color:#64748b;">
                      <span style="display:inline-block;width:22px;height:22px;background-color:#ecfdf5;color:#0f766e;border-radius:50%;text-align:center;line-height:22px;font-size:12px;font-weight:700;margin-right:8px;">1</span>
                      Open the E-chashma app or dashboard
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;font-size:13px;line-height:1.5;color:#64748b;">
                      <span style="display:inline-block;width:22px;height:22px;background-color:#ecfdf5;color:#0f766e;border-radius:50%;text-align:center;line-height:22px;font-size:12px;font-weight:700;margin-right:8px;">2</span>
                      Go to Company Verification &rarr; Email
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;font-size:13px;line-height:1.5;color:#64748b;">
                      <span style="display:inline-block;width:22px;height:22px;background-color:#ecfdf5;color:#0f766e;border-radius:50%;text-align:center;line-height:22px;font-size:12px;font-weight:700;margin-right:8px;">3</span>
                      Enter the 6-digit code above
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
          <p style="margin:24px 0 0 0;font-size:13px;line-height:1.6;color:#94a3b8;text-align:center;">
            Didn&apos;t request this? You can safely ignore this email — your account remains secure.
          </p>
        </td>
      </tr>
    </table>`

  return emailLayout({
    preheader: `Your E-chashma verification code is ${otp}. Expires in ${OTP_EXPIRY_MINUTES} minutes.`,
    bodyHtml,
    footerNote:
      'This is an automated message sent for company contact verification. Please do not reply to this email.'
  })
}

module.exports = {
  buildEmailVerificationOtpHtml
}
