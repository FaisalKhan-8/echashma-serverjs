const { BILLING_PERIOD_LABELS } = require('./membershipTransactionConstants');

const ORGANIZATION = {
  name: 'E-chashma',
  email: process.env.EMAIL_USER || 'support@echashma.in',
  mobile: '+91 98765 43210',
  address: 'India',
  website: process.env.FRONTEND_URL || 'https://echashma.in',
};

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount);
}

function generateInvoiceHTML({ transaction, membershipPlan, company }) {
  const billingAddress = transaction.billingAddress || {};
  const priceBreakdown = transaction.priceBreakdown || {};
  const statusLower = String(transaction.transactionStatus || '').toLowerCase();
  let statusBadgeStyle =
    'display:inline-block;padding:5px 15px;border-radius:20px;font-size:12px;font-weight:bold;margin-left:10px;background-color:#ffc107;color:#856404;';
  if (statusLower === 'success') {
    statusBadgeStyle =
      'display:inline-block;padding:5px 15px;border-radius:20px;font-size:12px;font-weight:bold;margin-left:10px;background-color:#28a745;color:#fff;';
  } else if (statusLower === 'failed') {
    statusBadgeStyle =
      'display:inline-block;padding:5px 15px;border-radius:20px;font-size:12px;font-weight:bold;margin-left:10px;background-color:#dc3545;color:#fff;';
  }

  const txId = String(transaction.id || transaction.uuid || 'UNKNOWN');
  const invoiceNumber = `ECH-${txId.padStart(8, '0').slice(-8).toUpperCase()}`;
  const invoiceDate = new Date().toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const basePrice = priceBreakdown.basePrice;
  const billingLabel =
    BILLING_PERIOD_LABELS[transaction.billingPeriod] ||
    transaction.billingPeriod;

  const tdRow =
    'padding:6px;border-bottom:1px solid #ddd;font-size:10px;color:#333;';
  const tdLabel = `${tdRow}font-weight:bold;`;
  const tdAmount = `${tdRow}text-align:right;`;
  const tdLast = 'padding:6px;border-bottom:none;font-size:10px;color:#333;';
  const tdLastAmount = `${tdLast}text-align:right;`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Invoice - ${invoiceNumber}</title>
</head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;line-height:1.4;color:#333;background-color:#fff;">
  <div style="max-width:100%;margin:0;padding:15mm;">
    <div style="display:flex;justify-content:space-between;margin-bottom:15px;padding-bottom:10px;border-bottom:2px solid #0f766e;">
      <div>
        <h1 style="color:#0f766e;font-size:20px;margin:0 0 5px 0;">${ORGANIZATION.name}</h1>
        <p style="color:#666;font-size:11px;margin:2px 0;">Email: ${ORGANIZATION.email}</p>
      </div>
      <div style="text-align:right;">
        <h2 style="color:#333;font-size:18px;margin:0 0 5px 0;">INVOICE</h2>
        <p style="color:#666;font-size:11px;margin:2px 0;"><strong>Invoice #:</strong> ${invoiceNumber}</p>
        <p style="color:#666;font-size:11px;margin:2px 0;"><strong>Date:</strong> ${invoiceDate}</p>
        <p style="color:#666;font-size:11px;margin:2px 0;"><strong>Status:</strong> <span style="${statusBadgeStyle}">${transaction.transactionStatus}</span></p>
      </div>
    </div>

    <div style="display:flex;justify-content:space-between;margin-bottom:15px;">
      <div style="flex:1;padding:10px;background-color:#f9f9f9;border-radius:3px;margin:0 5px 0 0;">
        <h3 style="color:#0f766e;font-size:12px;margin:0 0 8px 0;padding-bottom:5px;border-bottom:1px solid #0f766e;">Bill To</h3>
        <p style="color:#666;font-size:10px;margin:3px 0;"><strong>${billingAddress.fullName || ''}</strong></p>
        <p style="color:#666;font-size:10px;margin:3px 0;">${billingAddress.email || ''}</p>
        <p style="color:#666;font-size:10px;margin:3px 0;">${billingAddress.phone || ''}</p>
        <p style="color:#666;font-size:10px;margin:3px 0;">${billingAddress.address || ''}</p>
        <p style="color:#666;font-size:10px;margin:3px 0;">${billingAddress.city || ''}, ${billingAddress.state || ''}</p>
        <p style="color:#666;font-size:10px;margin:3px 0;">${billingAddress.pincode || ''}, ${billingAddress.country || ''}</p>
      </div>
      <div style="flex:1;padding:10px;background-color:#f9f9f9;border-radius:3px;margin:0 0 0 5px;">
        <h3 style="color:#0f766e;font-size:12px;margin:0 0 8px 0;padding-bottom:5px;border-bottom:1px solid #0f766e;">Company</h3>
        <p style="color:#666;font-size:10px;margin:3px 0;"><strong>${company.companyName || ''}</strong></p>
        <p style="color:#666;font-size:10px;margin:3px 0;">${company.email || ''}</p>
        <p style="color:#666;font-size:10px;margin:3px 0;">${company.phone || ''}</p>
        ${company.address ? `<p style="color:#666;font-size:10px;margin:3px 0;">${company.address}</p>` : ''}
      </div>
    </div>

    <div style="background-color:#f9f9f9;padding:10px;border-radius:3px;margin-bottom:15px;">
      <h3 style="color:#0f766e;font-size:13px;margin:0 0 8px 0;">Membership Plan Details</h3>
      <p style="color:#666;font-size:10px;margin:3px 0;"><strong>Plan Name:</strong> ${membershipPlan.name}</p>
      <p style="color:#666;font-size:10px;margin:3px 0;"><strong>Billing Period:</strong> ${billingLabel}</p>
      <p style="color:#666;font-size:10px;margin:3px 0;"><strong>Subscription Start:</strong> ${new Date(transaction.subscriptionStartDate || new Date()).toLocaleDateString('en-IN')}</p>
      <p style="color:#666;font-size:10px;margin:3px 0;"><strong>Subscription End:</strong> ${new Date(transaction.subscriptionEndDate || new Date()).toLocaleDateString('en-IN')}</p>
    </div>

    <table style="width:100%;border-collapse:collapse;margin-bottom:10px;font-size:11px;" cellpadding="0" cellspacing="0">
      <thead>
        <tr>
          <th style="background-color:#0f766e;color:white;padding:6px;text-align:left;font-weight:bold;font-size:11px;">Description</th>
          <th style="background-color:#0f766e;color:white;padding:6px;text-align:right;font-weight:bold;font-size:11px;">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="${tdLabel}">Base Price</td>
          <td style="${tdAmount}">${formatCurrency(basePrice)}</td>
        </tr>
        ${
          transaction.couponCode
            ? `<tr>
          <td style="${tdLabel}">Coupon Discount (${transaction.couponCode})</td>
          <td style="padding:6px;border-bottom:1px solid #ddd;font-size:10px;color:#28a745;text-align:right;">- ${formatCurrency(priceBreakdown.couponDiscount || 0)}</td>
        </tr>`
            : ''
        }
        <tr>
          <td style="${tdLabel}">Subtotal</td>
          <td style="${tdAmount}">${formatCurrency(priceBreakdown.subtotal)}</td>
        </tr>
        <tr>
          <td style="${tdLast}font-weight:bold;">GST (${Number(membershipPlan.gstPercentage || 18)}%)</td>
          <td style="${tdLastAmount}">${formatCurrency(priceBreakdown.gstAmount)}</td>
        </tr>
      </tbody>
    </table>

    <div style="background-color:#0f766e;color:white;padding:10px;border-radius:3px;text-align:right;">
      <h3 style="font-size:14px;margin:0 0 5px 0;color:white;">Total Amount</h3>
      <div style="font-size:20px;font-weight:bold;color:white;">${formatCurrency(priceBreakdown.totalAmount)}</div>
    </div>

    ${
      transaction.paymentGateway
        ? `<div style="margin-top:20px;padding:15px;background-color:#f9f9f9;border-radius:5px;">
      <p style="margin:6px 0;font-size:11px;color:#333;"><strong>Payment Gateway:</strong> ${String(transaction.paymentGateway).toUpperCase()}</p>
      ${transaction.cashfreePaymentId ? `<p style="margin:6px 0;font-size:11px;color:#333;"><strong>Cashfree Payment ID:</strong> ${transaction.cashfreePaymentId}</p>` : ''}
      ${transaction.cashfreeOrderId ? `<p style="margin:6px 0;font-size:11px;color:#333;"><strong>Cashfree Order ID:</strong> ${transaction.cashfreeOrderId}</p>` : ''}
    </div>`
        : ''
    }

    <div style="margin-top:10px;padding-top:10px;border-top:1px solid #ddd;text-align:center;color:#666;font-size:9px;">
      <p style="margin:2px 0;">Thank you for your business!</p>
      <p style="margin:2px 0;">&copy; ${new Date().getFullYear()} ${ORGANIZATION.name}. All rights reserved.</p>
      <p style="margin:5px 0 2px 0;">This is a computer-generated invoice and does not require a signature.</p>
    </div>
  </div>
</body>
</html>`;
}

module.exports = {
  generateInvoiceHTML,
  ORGANIZATION,
  formatCurrency,
};
