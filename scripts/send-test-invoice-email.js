require('dotenv').config();
const { generateInvoiceHTML } = require('../src/utils/invoiceHtml');
const { generateInvoicePDF } = require('../src/utils/invoicePdf');
const { sendMembershipInvoiceEmail } = require('../src/utils/transactionEmail');

const testEmail = process.argv[2] || 'mdfaisalkhan1500@gmail.com';
const invoiceNumber = 'ECH-00009999';

const billingAddress = {
  fullName: 'Faisal Khan',
  email: testEmail,
  phone: '+91 9876543210',
  address: '123 Test Street',
  city: 'Mumbai',
  state: 'Maharashtra',
  pincode: '400001',
  country: 'India',
};

const priceBreakdown = {
  basePrice: 999,
  couponDiscount: 100,
  subtotal: 899,
  gstAmount: 161.82,
  totalAmount: 1060.82,
};

const now = new Date();
const subscriptionEnd = new Date(now);
subscriptionEnd.setMonth(subscriptionEnd.getMonth() + 1);

const transaction = {
  id: 9999,
  billingPeriod: 'monthly',
  transactionStatus: 'SUCCESS',
  couponCode: 'TEST10',
  paymentGateway: 'cashfree',
  cashfreePaymentId: 'TEST-PAY-123456',
  cashfreeOrderId: 'TEST-ORDER-789012',
  subscriptionStartDate: now,
  subscriptionEndDate: subscriptionEnd,
  billingAddress,
  priceBreakdown,
};

const membershipPlan = { name: 'Pro Plan', gstPercentage: 18 };
const company = {
  companyName: 'Demo Opticals',
  contactPerson: 'Faisal Khan',
  email: 'demo@echashma.in',
  phone: '+91 9876543210',
  address: '456 Business Park, Mumbai',
};

async function main() {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('EMAIL_USER and EMAIL_PASS must be set in .env');
    process.exit(1);
  }

  console.log('Generating invoice PDF...');
  const html = generateInvoiceHTML({ transaction, membershipPlan, company });
  const pdfBuffer = await generateInvoicePDF(html);
  const pdfFileName = `Invoice-${invoiceNumber}.pdf`;

  console.log(`PDF generated (${pdfBuffer.length} bytes). Sending email...`);
  await sendMembershipInvoiceEmail({
    transaction,
    membershipPlan,
    company,
    pdfBuffer,
    pdfFileName,
  });

  console.log(`Test invoice email with PDF sent to ${testEmail}`);
}

main().catch((err) => {
  console.error('Failed to send:', err.message);
  process.exit(1);
});
