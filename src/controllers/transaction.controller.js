const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const { AppError } = require('../errors/AppError');
const db = require('../utils/db.config');
const {
  createOrder,
  getOrder,
  getOrderPayments,
  verifyWebhookSignature,
  normalizeCustomerPhone,
  getClientId,
  getCashfreePaymentFailedMessageFromWebhookData,
} = require('../utils/cashfree');
const {
  TRANSACTION_STATUS,
  BILLING_PERIOD,
  PAYMENT_GATEWAY,
  PAYMENT_METHOD,
  addBillingPeriod,
  getBasePriceForPeriod,
  parseJsonField,
  getInvoiceUrl,
  serializeTransaction,
} = require('../utils/membershipTransactionConstants');
const {
  applyCoupon,
  verifyCouponWithDetails,
} = require('./coupon.controller');
const {
  sendMembershipInvoiceEmail,
  sendTransactionFailureEmail,
} = require('../utils/transactionEmail');
const { generateInvoiceHTML } = require('../utils/invoiceHtml');
const { generateInvoicePDF } = require('../utils/invoicePdf');
const { uploadPublicObject } = require('../utils/s3');

const WEBHOOK_LOG_DIR = path.join(process.cwd(), 'logs', 'webhooks', 'cashfree-logs');

function ensureWebhookLogDir() {
  if (!fs.existsSync(WEBHOOK_LOG_DIR)) {
    fs.mkdirSync(WEBHOOK_LOG_DIR, { recursive: true });
  }
}

function appendWebhookLog(event, payload, signatureValid) {
  try {
    ensureWebhookLogDir();
    const file = path.join(
      WEBHOOK_LOG_DIR,
      `cashfree-${new Date().toISOString().split('T')[0]}.log`
    );
    const line = JSON.stringify({
      at: new Date().toISOString(),
      event,
      signatureValid,
      payload,
    });
    fs.appendFileSync(file, `${line}\n`, 'utf8');
  } catch (error) {
    console.error('Failed to write Cashfree webhook log:', error.message);
  }
}

function requireCompanyId(req, res) {
  const companyId = req.user?.companyId;
  if (!companyId) {
    res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: {
        authorization: ['Company ID is missing from token'],
      },
    });
    return null;
  }
  return companyId;
}

function isCompanyMembershipExpired(company, now = new Date()) {
  return (
    company.membership === 'EXPIRED' ||
    company.membership === 'TRIAL_EXPIRED' ||
    (company.membershipEndDate && new Date(company.membershipEndDate) < now)
  );
}

async function updateCompanyMembership(
  companyId,
  membershipPlanId,
  expiryDate,
  planName,
  startDate
) {
  const now = new Date();
  const isExpired = expiryDate < now;
  await db.company.update({
    where: { id: companyId },
    data: {
      membershipPlanId,
      membershipName: planName,
      membershipStartDate: startDate || now,
      membershipEndDate: expiryDate,
      membership: isExpired ? 'EXPIRED' : 'ACTIVE',
    },
  });
}

async function generateAndSaveMembershipInvoice(transactionRow, options = {}) {
  const { skipIfExists = true } = options;

  if (transactionRow.transactionStatus !== TRANSACTION_STATUS.SUCCESS) {
    return { url: null, pdfBuffer: null, fileName: null };
  }

  if (skipIfExists && transactionRow.invoicePdfUrl) {
    return {
      url: transactionRow.invoicePdfUrl,
      pdfBuffer: null,
      fileName: null,
    };
  }

  const membershipPlan = await db.membershipPlan.findUnique({
    where: { id: transactionRow.membershipPlanId },
  });
  const company = await db.company.findUnique({
    where: { id: transactionRow.companyId },
  });
  if (!membershipPlan || !company) {
    return { url: null, pdfBuffer: null, fileName: null };
  }

  const viewTx = serializeTransaction(transactionRow);
  const invoiceData = { transaction: viewTx, membershipPlan, company };
  const invoiceNumber = `ECH-${String(transactionRow.id).padStart(8, '0').slice(-8).toUpperCase()}`;
  const fileName = `Invoice-${invoiceNumber}.pdf`;

  try {
    const html = generateInvoiceHTML(invoiceData);
    const pdfBuffer = await generateInvoicePDF(html);
    const upload = await uploadPublicObject({
      body: pdfBuffer,
      folder: `invoices/${transactionRow.companyId}`,
      originalName: fileName,
      contentType: 'application/pdf',
    });
    await db.membershipTransaction.update({
      where: { id: transactionRow.id },
      data: { invoicePdfUrl: upload.url },
    });
    return { url: upload.url, pdfBuffer, fileName };
  } catch (error) {
    console.error('Failed to generate/upload invoice PDF:', error.message);
    return { url: null, pdfBuffer: null, fileName: null };
  }
}

async function ensureInvoiceSaved(row) {
  if (
    !row ||
    row.transactionStatus !== TRANSACTION_STATUS.SUCCESS ||
    row.invoicePdfUrl
  ) {
    return row;
  }

  await generateAndSaveMembershipInvoice(row);
  return db.membershipTransaction.findUnique({ where: { id: row.id } });
}

async function sendSuccessSideEffects(transactionRow) {
  const membershipPlan = await db.membershipPlan.findUnique({
    where: { id: transactionRow.membershipPlanId },
  });
  const company = await db.company.findUnique({
    where: { id: transactionRow.companyId },
  });
  if (!membershipPlan || !company) return;

  const viewTx = serializeTransaction(transactionRow);
  const invoiceData = { transaction: viewTx, membershipPlan, company };
  const { pdfBuffer, fileName } = await generateAndSaveMembershipInvoice(
    transactionRow
  );

  try {
    await sendMembershipInvoiceEmail({
      ...invoiceData,
      pdfBuffer,
      pdfFileName: fileName,
    });
  } catch (error) {
    console.error('Failed to send invoice email:', error.message);
  }
}

async function confirmPayment(transactionId, cfPaymentId) {
  const transaction = await db.membershipTransaction.findUnique({
    where: { id: transactionId },
  });
  if (!transaction) {
    throw new AppError('Transaction not found', 404);
  }
  if (transaction.transactionStatus === TRANSACTION_STATUS.SUCCESS) {
    return transaction;
  }

  const updateData = {
    transactionStatus: TRANSACTION_STATUS.SUCCESS,
  };
  if (cfPaymentId) {
    updateData.cashfreePaymentId = String(cfPaymentId);
  }

  const saved = await db.membershipTransaction.update({
    where: { id: transactionId },
    data: updateData,
  });

  if (saved.subscriptionEndDate) {
    const plan = await db.membershipPlan.findUnique({
      where: { id: saved.membershipPlanId },
    });
    await updateCompanyMembership(
      saved.companyId,
      saved.membershipPlanId,
      saved.subscriptionEndDate,
      plan?.name || null,
      saved.subscriptionStartDate
    );
  }

  if (saved.couponCode) {
    await applyCoupon(saved.couponCode, saved.companyId);
  }

  await sendSuccessSideEffects(saved);
  return db.membershipTransaction.findUnique({ where: { id: transactionId } });
}

async function failTransaction(transaction, reason) {
  if (!transaction || transaction.transactionStatus !== TRANSACTION_STATUS.PENDING) {
    return transaction;
  }
  const saved = await db.membershipTransaction.update({
    where: { id: transaction.id },
    data: {
      transactionStatus: TRANSACTION_STATUS.FAILED,
      failureReason: reason,
    },
  });
  try {
    await sendTransactionFailureEmail(saved, reason);
  } catch (error) {
    console.error('Failed to send failure email:', error.message);
  }
  return saved;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function buildTransactionLookup(tx) {
  const value = String(tx || '').trim();
  if (!value) return null;

  const numericId = parseInt(value, 10);
  if (!Number.isNaN(numericId) && String(numericId) === value) {
    return { id: numericId };
  }

  if (UUID_RE.test(value)) {
    return { uuid: value };
  }

  if (value.startsWith('ech_')) {
    return { cashfreeOrderId: value };
  }

  return null;
}

function normalizeCashfreePayments(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.payments)) return payload.payments;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function getLatestPayment(payments) {
  if (!payments.length) return null;
  return payments[payments.length - 1];
}

async function syncTransactionFromCashfree(transaction) {
  if (
    transaction.transactionStatus !== TRANSACTION_STATUS.PENDING ||
    transaction.paymentGateway !== PAYMENT_GATEWAY.CASHFREE ||
    !transaction.cashfreeOrderId
  ) {
    return transaction;
  }

  try {
    const order = await getOrder(transaction.cashfreeOrderId);
    const orderStatus = String(order?.order_status || '').toUpperCase();

    if (orderStatus === 'PAID') {
      const payments = normalizeCashfreePayments(
        await getOrderPayments(transaction.cashfreeOrderId)
      );
      const latestPayment = getLatestPayment(payments);
      const cfPaymentId =
        latestPayment?.cf_payment_id != null
          ? String(latestPayment.cf_payment_id)
          : undefined;
      return confirmPayment(transaction.id, cfPaymentId);
    }

    if (orderStatus === 'EXPIRED') {
      return failTransaction(transaction, 'Payment order expired');
    }

    if (orderStatus === 'TERMINATED') {
      return failTransaction(transaction, 'Payment order was terminated');
    }

    const payments = normalizeCashfreePayments(
      await getOrderPayments(transaction.cashfreeOrderId)
    );
    const latestPayment = getLatestPayment(payments);
    const paymentStatus = String(latestPayment?.payment_status || '').toUpperCase();

    if (paymentStatus === 'SUCCESS') {
      const cfPaymentId =
        latestPayment?.cf_payment_id != null
          ? String(latestPayment.cf_payment_id)
          : undefined;
      return confirmPayment(transaction.id, cfPaymentId);
    }

    if (paymentStatus === 'FAILED' || paymentStatus === 'CANCELLED') {
      const reason =
        latestPayment?.payment_message ||
        latestPayment?.error_details?.error_description ||
        latestPayment?.error_details?.error_reason ||
        'Cashfree payment failed';
      return failTransaction(transaction, reason);
    }
  } catch (error) {
    console.error(
      `[Payment poll] Cashfree sync failed for tx ${transaction.id}:`,
      error.message
    );
  }

  return transaction;
}

function buildPaymentPollResponse(row) {
  const status = row.transactionStatus;
  const success = status === TRANSACTION_STATUS.SUCCESS;
  const failed =
    status === TRANSACTION_STATUS.FAILED ||
    status === TRANSACTION_STATUS.CANCELLED;
  const pending = status === TRANSACTION_STATUS.PENDING;
  const completed = success || failed;

  return {
    transactionId: row.id,
    transactionUuid: row.uuid,
    transactionStatus: status,
    completed,
    success,
    failed,
    pending,
    membershipPlan: row.membershipPlan
      ? {
          id: row.membershipPlan.id,
          name: row.membershipPlan.name,
        }
      : undefined,
    billingPeriod: row.billingPeriod,
    priceBreakdown: parseJsonField(row.priceBreakdownJson, {}),
    couponCode: row.couponCode,
    failureReason: row.failureReason,
    cashfreeOrderId: row.cashfreeOrderId,
    invoicePdfUrl: row.invoicePdfUrl || null,
    invoiceUrl: getInvoiceUrl(row),
    subscriptionStartDate: row.subscriptionStartDate,
    subscriptionEndDate: row.subscriptionEndDate,
    nextBillingDate: row.nextBillingDate,
  };
}

const purchaseMembership = async (req, res, next) => {
  const companyId = requireCompanyId(req, res);
  if (companyId === null) return;

  try {
    const body = req.body;
    const membershipPlanId = body.membershipId;
    const billingPeriod = body.billingPeriod;

    const membershipPlan = await db.membershipPlan.findUnique({
      where: { id: membershipPlanId },
    });
    if (!membershipPlan) {
      throw new AppError('Membership plan not found', 404);
    }
    if (membershipPlan.status !== 'ACTIVE') {
      throw new AppError('Membership plan is not active', 400);
    }

    const company = await db.company.findUnique({ where: { id: companyId } });
    if (!company) {
      throw new AppError('Company not found', 404);
    }

    const lastSuccess = await db.membershipTransaction.findFirst({
      where: {
        companyId,
        transactionStatus: TRANSACTION_STATUS.SUCCESS,
      },
      orderBy: { created_at: 'desc' },
    });

    const isSamePlan = company.membershipPlanId === membershipPlanId;
    const isExpired = isCompanyMembershipExpired(company);
    if (
      isSamePlan &&
      lastSuccess?.billingPeriod === billingPeriod &&
      !isExpired
    ) {
      throw new AppError(
        'You cannot purchase the same membership plan with the same billing period while your membership is still active. Choose a different plan or billing period.',
        400
      );
    }

    const basePrice = getBasePriceForPeriod(membershipPlan, billingPeriod);
    if (!basePrice || basePrice <= 0) {
      throw new AppError(
        `${billingPeriod} price is not available for this membership plan`,
        400
      );
    }

    if (Math.abs(body.priceBreakdown.basePrice - basePrice) > 0.01) {
      throw new AppError(
        'Price breakdown does not match membership plan pricing',
        400
      );
    }

    let finalPriceBreakdown = { ...body.priceBreakdown };
    let appliedCouponCode = null;

    if (body.couponCode) {
      const verification = await verifyCouponWithDetails({
        code: body.couponCode,
        purchaseAmount: basePrice,
        companyId,
        membershipPlanId,
        billingPeriod,
      });

      if (verification.valid && verification.discount > 0) {
        const couponDiscount = verification.discount;
        const subtotal = Math.max(0, basePrice - couponDiscount);
        const gstAmount =
          (subtotal * Number(membershipPlan.gstPercentage || 18)) / 100;
        finalPriceBreakdown = {
          basePrice,
          couponDiscount,
          subtotal,
          gstAmount,
          totalAmount: subtotal + gstAmount,
        };
        appliedCouponCode = body.couponCode;
      }
    }

    if (!body.billingAddressSameAsInstitute) {
      await db.company.update({
        where: { id: companyId },
        data: {
          billingAddressJson: JSON.stringify(body.billingAddress),
        },
      });
    }

    const startDate = new Date();
    const endDate = addBillingPeriod(startDate, billingPeriod);

    const useCashfree =
      body.paymentMethod === PAYMENT_METHOD.ONLINE &&
      body.onlineGateway === PAYMENT_GATEWAY.CASHFREE;

    const txUuid = randomUUID();
    const cashfreeMerchantOrderId = useCashfree
      ? `ech_${txUuid.replace(/-/g, '').slice(0, 40)}`
      : null;

    let transactionStatus = TRANSACTION_STATUS.PENDING;
    let failureReason = null;
    let cashfreeCfOrderId = null;
    let cashfreePaymentSessionId = null;
    let cashfreeResponseJson = null;

    if (useCashfree) {
      try {
        const phone = normalizeCustomerPhone(body.billingAddress.phone);
        const publicBase = (process.env.PUBLIC_API_BASE_URL || '').replace(/\/$/, '');
        const notifyUrl = publicBase
          ? `${publicBase}/api/transactions/webhook/cashfree`
          : undefined;
        const fallbackReturn = publicBase
          ? `${publicBase}/payment/return?order_id=${encodeURIComponent(cashfreeMerchantOrderId)}`
          : `${(process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '')}/payment/return?order_id=${encodeURIComponent(cashfreeMerchantOrderId)}`;
        const returnUrl = body.successUrl
          ? body.successUrl.replace('{transaction_id}', txUuid)
          : fallbackReturn;

        const cfOrder = await createOrder({
          orderId: cashfreeMerchantOrderId,
          orderAmount: finalPriceBreakdown.totalAmount,
          customerName: body.billingAddress.fullName,
          customerEmail: body.billingAddress.email,
          customerPhone: phone,
          customerReferenceId: `co_${companyId}`,
          returnUrl,
          notifyUrl,
          orderNote: `${membershipPlan.name} (${billingPeriod})`.slice(0, 200),
        });

        cashfreeCfOrderId =
          cfOrder.cf_order_id != null ? String(cfOrder.cf_order_id) : null;
        cashfreePaymentSessionId =
          cfOrder.payment_session_id != null
            ? String(cfOrder.payment_session_id)
            : null;
        cashfreeResponseJson = JSON.stringify(cfOrder);
      } catch (error) {
        transactionStatus = TRANSACTION_STATUS.FAILED;
        failureReason = error.message || 'Failed to create Cashfree order';
      }
    } else if (body.paymentMethod === PAYMENT_METHOD.OFFLINE) {
      // Offline payments stay PENDING until manually confirmed by admin.
    } else {
      throw new AppError('Only Cashfree online payments are supported', 400);
    }

    const saved = await db.membershipTransaction.create({
      data: {
        uuid: txUuid,
        membershipPlanId,
        companyId,
        billingPeriod,
        billingAddressJson: JSON.stringify(body.billingAddress),
        billingAddressSameAsCompany: body.billingAddressSameAsInstitute,
        paymentGateway:
          body.paymentMethod === PAYMENT_METHOD.OFFLINE
            ? 'offline'
            : PAYMENT_GATEWAY.CASHFREE,
        paymentMethod: body.paymentMethod,
        priceBreakdownJson: JSON.stringify(finalPriceBreakdown),
        couponCode: appliedCouponCode || body.couponCode || null,
        successUrl: body.successUrl || null,
        failureUrl: body.failureUrl || null,
        transactionStatus,
        cashfreeOrderId: cashfreeMerchantOrderId,
        cashfreeCfOrderId,
        cashfreePaymentSessionId,
        cashfreeResponseJson,
        failureReason,
        subscriptionStartDate: startDate,
        subscriptionEndDate: endDate,
        nextBillingDate: endDate,
      },
    });

    if (transactionStatus === TRANSACTION_STATUS.FAILED) {
      try {
        await sendTransactionFailureEmail(saved, failureReason);
      } catch (error) {
        console.error('Failed to send failure email:', error.message);
      }
    }

    const transactionId = saved.id;
    const successUrl = saved.successUrl
      ? saved.successUrl.replace('{transaction_id}', String(transactionId))
      : null;
    const failureUrl = saved.failureUrl
      ? saved.failureUrl.replace('{transaction_id}', String(transactionId))
      : null;

    res.status(201).json({
      transactionId,
      membershipPlan: {
        id: membershipPlan.id,
        name: membershipPlan.name,
      },
      billingPeriod: saved.billingPeriod,
      priceBreakdown: finalPriceBreakdown,
      couponCode: saved.couponCode,
      transactionStatus: saved.transactionStatus,
      ...(saved.failureReason ? { failureReason: saved.failureReason } : {}),
      paymentGateway: saved.paymentGateway,
      cashfreeOrderId: saved.cashfreeOrderId,
      cashfreePaymentSessionId: saved.cashfreePaymentSessionId,
      cashfreeClientId:
        saved.paymentGateway === PAYMENT_GATEWAY.CASHFREE ? getClientId() : null,
      subscriptionStartDate: saved.subscriptionStartDate,
      subscriptionEndDate: saved.subscriptionEndDate,
      nextBillingDate: saved.nextBillingDate,
      successUrl,
      failureUrl,
      invoicePdfUrl: null,
      invoiceUrl: null,
    });
  } catch (error) {
    next(error);
  }
};

const findAll = async (req, res, next) => {
  const companyId = requireCompanyId(req, res);
  if (companyId === null) return;

  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const where = { companyId };

    const [total, rows] = await Promise.all([
      db.membershipTransaction.count({ where }),
      db.membershipTransaction.findMany({
        where,
        include: {
          membershipPlan: { select: { id: true, name: true, description: true } },
        },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    res.json({
      data: rows.map(serializeTransaction),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

const pollPaymentStatus = async (req, res, next) => {
  const companyId = requireCompanyId(req, res);
  if (companyId === null) return;

  const lookup = buildTransactionLookup(req.params.tx);
  if (!lookup) {
    return next(new AppError('Invalid transaction reference', 400));
  }

  try {
    let row = await db.membershipTransaction.findFirst({
      where: { ...lookup, companyId },
      include: {
        membershipPlan: { select: { id: true, name: true } },
      },
    });

    if (!row) {
      throw new AppError('Transaction not found', 404);
    }

    row = await syncTransactionFromCashfree(row);

    if (row.transactionStatus !== TRANSACTION_STATUS.PENDING) {
      row = await ensureInvoiceSaved(row);
      row = await db.membershipTransaction.findFirst({
        where: { id: row.id, companyId },
        include: {
          membershipPlan: { select: { id: true, name: true } },
        },
      });
    }

    res.json(buildPaymentPollResponse(row));
  } catch (error) {
    next(error);
  }
};

const findOne = async (req, res, next) => {
  const companyId = requireCompanyId(req, res);
  if (companyId === null) return;

  const transactionId = parseInt(req.params.id, 10);
  if (Number.isNaN(transactionId)) {
    return next(new AppError('Invalid transaction id', 400));
  }

  try {
    const row = await db.membershipTransaction.findFirst({
      where: { id: transactionId, companyId },
      include: {
        membershipPlan: {
          select: {
            id: true,
            name: true,
            description: true,
            monthlyPrice: true,
            annualPrice: true,
          },
        },
        company: { select: { id: true, companyName: true, email: true } },
      },
    });
    if (!row) {
      throw new AppError('Transaction not found', 404);
    }

    const withInvoice = await ensureInvoiceSaved(row);
    const refreshed = await db.membershipTransaction.findFirst({
      where: { id: withInvoice.id, companyId },
      include: {
        membershipPlan: {
          select: {
            id: true,
            name: true,
            description: true,
            monthlyPrice: true,
            annualPrice: true,
          },
        },
        company: { select: { id: true, companyName: true, email: true } },
      },
    });

    res.json(serializeTransaction(refreshed));
  } catch (error) {
    next(error);
  }
};

const downloadInvoice = async (req, res, next) => {
  const companyId = requireCompanyId(req, res);
  if (companyId === null) return;

  const transactionId = parseInt(req.params.id, 10);
  if (Number.isNaN(transactionId)) {
    return next(new AppError('Invalid transaction id', 400));
  }

  try {
    const row = await db.membershipTransaction.findFirst({
      where: { id: transactionId, companyId },
      include: { membershipPlan: true, company: true },
    });
    if (!row) {
      throw new AppError('Transaction not found', 404);
    }

    const saved = await ensureInvoiceSaved(row);
    if (saved?.invoicePdfUrl) {
      return res.redirect(saved.invoicePdfUrl);
    }

    const { pdfBuffer } = await generateAndSaveMembershipInvoice(row, {
      skipIfExists: true,
    });
    if (pdfBuffer) {
      const invoiceNumber = `ECH-${String(row.id).padStart(8, '0').slice(-8).toUpperCase()}`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="Invoice-${invoiceNumber}.pdf"`
      );
      return res.send(pdfBuffer);
    }

    throw new AppError('Invoice is not available for this transaction', 404);
  } catch (error) {
    next(error);
  }
};

async function processCashfreeWebhookPayload(payload, signatureValid) {
  const eventType = payload?.type || 'unknown';
  const orderId = payload?.data?.order?.order_id;
  const cfPaymentId =
    payload?.data?.payment?.cf_payment_id != null
      ? String(payload.data.payment.cf_payment_id)
      : undefined;

  if (!orderId) {
    return { received: true, message: 'No order_id in payload' };
  }

  const transaction = await db.membershipTransaction.findFirst({
    where: { cashfreeOrderId: orderId },
  });
  if (!transaction) {
    return {
      received: true,
      processed: false,
      message: `Transaction not found for order_id: ${orderId}`,
      type: eventType,
      signatureValid,
    };
  }

  if (eventType === 'PAYMENT_SUCCESS_WEBHOOK') {
    await confirmPayment(transaction.id, cfPaymentId);
    return {
      received: true,
      processed: true,
      type: eventType,
      orderId,
      signatureValid,
    };
  }

  if (
    eventType === 'PAYMENT_FAILED_WEBHOOK' ||
    eventType === 'PAYMENT_USER_DROPPED_WEBHOOK'
  ) {
    const reason =
      eventType === 'PAYMENT_USER_DROPPED_WEBHOOK'
        ? 'Payment was not completed (user dropped off checkout)'
        : getCashfreePaymentFailedMessageFromWebhookData(payload.data);
    await failTransaction(transaction, reason);
    return {
      received: true,
      processed: true,
      type: eventType,
      orderId,
      signatureValid,
    };
  }

  return {
    received: true,
    processed: false,
    type: eventType,
    orderId,
    signatureValid,
  };
}

const handleCashfreeWebhook = async (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const timestamp = req.headers['x-webhook-timestamp'];
  const eventType = req.body?.type || 'unknown';
  let signatureValid = false;

  try {
    const payloadString =
      typeof req.rawBody === 'string' && req.rawBody.length > 0
        ? req.rawBody
        : JSON.stringify(req.body || {});

    if (signature && timestamp) {
      signatureValid = verifyWebhookSignature(
        signature,
        payloadString,
        timestamp
      );
      if (!signatureValid) {
        console.warn(
          `[Cashfree Webhook] Signature mismatch for ${eventType}. Check raw body verification.`
        );
      }
    }

    appendWebhookLog(`cashfree_${eventType}`, req.body, signatureValid);

    const result = await processCashfreeWebhookPayload(
      req.body,
      signatureValid
    );
    return res.status(200).json(result);
  } catch (error) {
    console.error('[Cashfree Webhook] Error:', error);
    appendWebhookLog('cashfree_error', {
      type: eventType,
      error: error.message,
      payload: req.body,
    }, signatureValid);
    return res.status(200).json({
      received: true,
      processed: false,
      error: 'Processing failed',
      type: eventType,
      signatureValid,
    });
  }
};

module.exports = {
  purchaseMembership,
  pollPaymentStatus,
  findAll,
  findOne,
  downloadInvoice,
  handleCashfreeWebhook,
  confirmPayment,
  failTransaction,
};
