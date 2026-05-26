const { Router } = require('express');
const authorizeAdmin = require('../middleware/authorizeAdmin');
const authenticateUser = require('../middleware/authenticateUser');
const validateRequest = require('../middleware/validateRequests');
const {
  createCouponSchema,
  updateCouponSchema,
  verifyCouponSchema,
} = require('../schema/coupon');
const {
  createCoupon,
  findAllCoupons,
  findOneCoupon,
  updateCoupon,
  removeCoupon,
  verifyCoupon,
} = require('../controllers/coupon.controller');

const couponRoutes = Router();

couponRoutes.post(
  '/verify',
  authenticateUser,
  validateRequest(verifyCouponSchema),
  verifyCoupon
);

couponRoutes.get('/', authorizeAdmin, findAllCoupons);
couponRoutes.get('/:id', authorizeAdmin, findOneCoupon);

couponRoutes.post(
  '/',
  authorizeAdmin,
  validateRequest(createCouponSchema),
  createCoupon
);

couponRoutes.patch(
  '/:id',
  authorizeAdmin,
  validateRequest(updateCouponSchema),
  updateCoupon
);

couponRoutes.delete('/:id', authorizeAdmin, removeCoupon);

module.exports = couponRoutes;
