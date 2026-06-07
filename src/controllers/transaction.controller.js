const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const { AppError } = require('../errors/AppError');
const db = require('../utils/db.config');
const {
  createOrder,
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
  const invoiceNumber = `ECH-${String(transactionRow.id).padStart(8, '0').slice(-8).toUpperCase()}`;
  const fileName = `Invoice-${invoiceNumber}.pdf`;

  let pdfBuffer = null;
  try {
    const html = generateInvoiceHTML(invoiceData);
    pdfBuffer = await generateInvoicePDF(html);
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
  } catch (error) {
    console.error('Failed to generate/upload invoice PDF:', error.message);
  }

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
  return saved;
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
    res.json(serializeTransaction(row));
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

    if (row.invoicePdfUrl) {
      return res.redirect(row.invoicePdfUrl);
    }

    const viewTx = serializeTransaction(row);
    const html = generateInvoiceHTML({
      transaction: viewTx,
      membershipPlan: row.membershipPlan,
      company: row.company,
    });
    const pdfBuffer = await generateInvoicePDF(html);
    const invoiceNumber = `ECH-${String(row.id).padStart(8, '0').slice(-8).toUpperCase()}`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Invoice-${invoiceNumber}.pdf"`
    );
    res.send(pdfBuffer);
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
  findAll,
  findOne,
  downloadInvoice,
  handleCashfreeWebhook,
  confirmPayment,
  failTransaction,
};
