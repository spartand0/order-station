const mongoose = require("mongoose");
const { Schema } = mongoose;

const Coupon = new Schema({
  id: { type: String, require: true },
  idCompany: { type: String, require: true },
  code: { type: String, require: true },
  percentage: { type: Boolean },
  amount: { type: Number, default: 0 },
  quantity: { type: Number, default: 0 },
  isUsed: { type: Boolean, default: false },
  multiUse: { type: Boolean, default: false },
  usedBy: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now() },
  startDate: { type: Date },
  endDate: { type: Date },
  isActive: { type: Boolean, default: true },
  isArchived: { type: Boolean, default: false },
  restaurant: { type: String, default: "" },
});

const CouponModel = mongoose.model("Coupon", Coupon);
module.exports = CouponModel;
