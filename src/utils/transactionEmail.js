const nodemailer = require('nodemailer');
const { ORGANIZATION } = require('./invoiceHtml');
const { parseJsonField } = require('./membershipTransactionConstants');

let transporter = null;

function getTransporter() {
  if (transporter !== null) return transporter;
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    transporter = false;
    return transporter;
  }
  transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
  return transporter;
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function toViewTransaction(row) {
  return {
    ...row,
    billingAddress: parseJsonField(row.billingAddressJson, {}),
    priceBreakdown: parseJsonField(row.priceBreakdownJson, {}),
  };
}

async function sendMembershipInvoiceEmail({
  transaction,
  membershipPlan,
  company,
  pdfBuffer,
  pdfFileName,
}) {
  const mailer = getTransporter();
  if (!mailer) {
    console.warn(
      'Email not configured. Skipping invoice email for transaction',
      transaction.id
    );
    return;
  }

  const viewTx = toViewTransaction(transaction);
  const billingAddress = viewTx.billingAddress;
  const priceBreakdown = viewTx.priceBreakdown;
  const invoiceNumber = `ECH-${String(transaction.id).padStart(8, '0').slice(-8).toUpperCase()}`;

  const mailOptions = {
    from: `"${ORGANIZATION.name}" <${process.env.EMAIL_USER}>`,
    to: billingAddress.email,
    cc: company.email,
    subject: `Membership Invoice - ${invoiceNumber} - ${membershipPlan.name}`,
    html: `
      <p>Dear ${escapeHtml(billingAddress.fullName)},</p>
      <p>Thank you for your membership purchase. Please find your invoice attached to this email.</p>
      <ul>
        <li><strong>Invoice Number:</strong> ${invoiceNumber}</li>
        <li><strong>Plan:</strong> ${escapeHtml(membershipPlan.name)}</li>
        <li><strong>Billing Period:</strong> ${escapeHtml(viewTx.billingPeriod)}</li>
        <li><strong>Total:</strong> ₹${Number(priceBreakdown.totalAmount || 0).toFixed(2)}</li>
      </ul>
      <p>If you have any questions, contact ${ORGANIZATION.email}.</p>
    `,
  };

  if (pdfBuffer && pdfFileName) {
    mailOptions.attachments = [
      {
        filename: pdfFileName,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ];
  }

  await mailer.sendMail(mailOptions);
}

async function sendTransactionFailureEmail(transaction, failureReason) {
  const mailer = getTransporter();
  if (!mailer) {
    console.warn(
      'Email not configured. Skipping failure email for transaction',
      transaction.id
    );
    return;
  }

  const viewTx = toViewTransaction(transaction);
  const billingAddress = viewTx.billingAddress;
  const priceBreakdown = viewTx.priceBreakdown;
  const customerMessage = escapeHtml(failureReason);

  await mailer.sendMail({
    from: `"${ORGANIZATION.name}" <${process.env.EMAIL_USER}>`,
    to: billingAddress.email,
    subject: `Transaction Failed - ID: ${transaction.id}`,
    html: `
      <p>Dear ${escapeHtml(billingAddress.fullName)},</p>
      <p>We regret to inform you that your transaction could not be completed.</p>
      <p><strong>Transaction ID:</strong> ${transaction.id}</p>
      <p><strong>Failure Reason:</strong> ${customerMessage}</p>
      <p><strong>Amount:</strong> ₹${Number(priceBreakdown.totalAmount || 0).toFixed(2)}</p>
      <p><strong>Payment Gateway:</strong> ${escapeHtml(viewTx.paymentGateway || 'cashfree')}</p>
      <p>If you believe this is an error, contact ${ORGANIZATION.email} with your transaction ID.</p>
    `,
  });
}

module.exports = {
  sendMembershipInvoiceEmail,
  sendTransactionFailureEmail,
};
