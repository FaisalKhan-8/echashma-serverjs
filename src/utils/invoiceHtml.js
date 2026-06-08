const { BILLING_PERIOD_LABELS } = require('./membershipTransactionConstants');
const { emailLayout, escapeHtml } = require('./emailTemplates');

const ORGANIZATION = {
  name: 'E-chashma',
  email: 'support@echashma.in',
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

function buildMembershipInvoiceEmailHtml({
  billingAddress,
  membershipPlan,
  company,
  transaction,
  priceBreakdown,
  invoiceNumber,
  hasPdfAttachment,
}) {
  const resolvedBreakdown =
    priceBreakdown && Object.keys(priceBreakdown).length > 0
      ? priceBreakdown
      : transaction.priceBreakdown || {};
  const customerName =
    billingAddress.fullName ||
    company?.contactPerson ||
    company?.companyName ||
    'Customer';
  const safeName = escapeHtml(customerName);
  const safePlanName = escapeHtml(membershipPlan.name);
  const billingLabel =
    BILLING_PERIOD_LABELS[transaction.billingPeriod] ||
    escapeHtml(transaction.billingPeriod);
  const totalFormatted = formatCurrency(resolvedBreakdown.totalAmount || 0);
  const statusLower = String(transaction.transactionStatus || '').toLowerCase();
  let statusBg = '#fffbeb';
  let statusBorder = '#f59e0b';
  let statusColor = '#92400e';
  if (statusLower === 'success') {
    statusBg = '#ecfdf5';
    statusBorder = '#0f766e';
    statusColor = '#065f46';
  } else if (statusLower === 'failed') {
    statusBg = '#fef2f2';
    statusBorder = '#ef4444';
    statusColor = '#991b1b';
  }

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
                &#128196;
              </td>
            </tr>
          </table>
          <h1 style="margin:0 0 8px 0;font-size:24px;font-weight:700;color:#0f172a;text-align:center;line-height:1.3;">
            Your membership invoice
          </h1>
          <p style="margin:0 0 28px 0;font-size:15px;line-height:1.6;color:#64748b;text-align:center;">
            Hi <strong style="color:#334155;">${safeName}</strong>, thank you for your membership purchase on E-chashma.
            ${hasPdfAttachment ? 'Your invoice is attached to this email.' : 'Your invoice details are below.'}
          </p>
          <!-- Invoice summary box -->
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px 0;">
            <tr>
              <td align="center" style="background-color:#f0fdfa;border:2px dashed #99f6e4;border-radius:12px;padding:24px 16px;">
                <p style="margin:0 0 6px 0;font-size:11px;font-weight:600;color:#0f766e;text-transform:uppercase;letter-spacing:1.5px;">
                  Total amount
                </p>
                <p style="margin:0 0 10px 0;font-size:32px;font-weight:800;color:#0f766e;letter-spacing:0.5px;">
                  ${totalFormatted}
                </p>
                <p style="margin:0;font-size:13px;color:#64748b;">
                  Invoice <strong style="color:#334155;">${escapeHtml(invoiceNumber)}</strong>
                </p>
              </td>
            </tr>
          </table>
          <!-- Status notice -->
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 20px 0;">
            <tr>
              <td style="background-color:${statusBg};border-left:4px solid ${statusBorder};border-radius:0 8px 8px 0;padding:14px 16px;">
                <p style="margin:0;font-size:13px;line-height:1.5;color:${statusColor};">
                  <strong>Status: ${escapeHtml(transaction.transactionStatus || 'Pending')}</strong>
                  ${hasPdfAttachment ? ' — A PDF copy of your invoice is attached.' : ''}
                </p>
              </td>
            </tr>
          </table>
          <!-- Invoice details -->
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td style="padding:16px 0 0 0;border-top:1px solid #f1f5f9;">
                <p style="margin:0 0 12px 0;font-size:13px;font-weight:600;color:#334155;">Invoice details</p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;">
                  <tr>
                    <td style="padding:16px 20px;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td style="padding:6px 0;font-size:13px;line-height:1.5;color:#64748b;">
                            <span style="display:inline-block;width:22px;height:22px;background-color:#ecfdf5;color:#0f766e;border-radius:50%;text-align:center;line-height:22px;font-size:12px;font-weight:700;margin-right:8px;">1</span>
                            <strong style="color:#334155;">Plan:</strong> ${safePlanName}
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:6px 0;font-size:13px;line-height:1.5;color:#64748b;">
                            <span style="display:inline-block;width:22px;height:22px;background-color:#ecfdf5;color:#0f766e;border-radius:50%;text-align:center;line-height:22px;font-size:12px;font-weight:700;margin-right:8px;">2</span>
                            <strong style="color:#334155;">Billing period:</strong> ${billingLabel}
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:6px 0;font-size:13px;line-height:1.5;color:#64748b;">
                            <span style="display:inline-block;width:22px;height:22px;background-color:#ecfdf5;color:#0f766e;border-radius:50%;text-align:center;line-height:22px;font-size:12px;font-weight:700;margin-right:8px;">3</span>
                            <strong style="color:#334155;">Subtotal:</strong> ${formatCurrency(resolvedBreakdown.subtotal || 0)}
                          </td>
                        </tr>
                        ${
                          transaction.couponCode
                            ? `<tr>
                          <td style="padding:6px 0;font-size:13px;line-height:1.5;color:#64748b;">
                            <span style="display:inline-block;width:22px;height:22px;background-color:#ecfdf5;color:#0f766e;border-radius:50%;text-align:center;line-height:22px;font-size:12px;font-weight:700;margin-right:8px;">4</span>
                            <strong style="color:#334155;">Coupon (${escapeHtml(transaction.couponCode)}):</strong>
                            <span style="color:#059669;">- ${formatCurrency(resolvedBreakdown.couponDiscount || 0)}</span>
                          </td>
                        </tr>`
                            : ''
                        }
                        <tr>
                          <td style="padding:6px 0;font-size:13px;line-height:1.5;color:#64748b;">
                            <span style="display:inline-block;width:22px;height:22px;background-color:#ecfdf5;color:#0f766e;border-radius:50%;text-align:center;line-height:22px;font-size:12px;font-weight:700;margin-right:8px;">${transaction.couponCode ? '5' : '4'}</span>
                            <strong style="color:#334155;">GST:</strong> ${formatCurrency(resolvedBreakdown.gstAmount || 0)}
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
          <p style="margin:24px 0 0 0;font-size:13px;line-height:1.6;color:#94a3b8;text-align:center;">
            Questions about your invoice? Contact us at
            <a href="mailto:${escapeHtml(ORGANIZATION.email)}" style="color:#0f766e;text-decoration:underline;">${escapeHtml(ORGANIZATION.email)}</a>.
          </p>
        </td>
      </tr>
    </table>`;

  return emailLayout({
    preheader: `Your E-chashma membership invoice ${invoiceNumber} for ${membershipPlan.name} — ${totalFormatted}.`,
    bodyHtml,
    footerNote:
      'This is an automated message regarding your membership purchase. Please do not reply to this email.',
    footerTermsHtml: `<p style="margin:0 0 12px 0;font-size:12px;line-height:1.6;color:#64748b;">
      This invoice confirms your E-chashma membership purchase and is subject to our
      <a href="${(process.env.FRONTEND_URL || 'https://echashma.in').replace(/\/$/, '')}/terms-and-conditions" style="color:#0f766e;text-decoration:underline;">Terms &amp; Conditions</a>
      and
      <a href="${(process.env.FRONTEND_URL || 'https://echashma.in').replace(/\/$/, '')}/privacy-policy" style="color:#0f766e;text-decoration:underline;">Privacy Policy</a>.
      Keep this email for your records. If you did not authorise this purchase, contact us immediately.
    </p>`,
  });
}

module.exports = {
  generateInvoiceHTML,
  buildMembershipInvoiceEmailHtml,
  ORGANIZATION,
  formatCurrency,
};
