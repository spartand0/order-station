const mongoose = require("mongoose");
const { Schema } = mongoose;

const Order = new Schema({
  id: { type: String, require: true },
  reference: { type: String, require: true },
  createdAt: { type: Date, default: Date.now() },
  createdBy: { type: String, default: "" },
  status: { type: String, default: "" }, // New - Accepted - Ready - Refused - Paid
  platform: { type: String, default: "" },
  productsTotalPrice: { type: Number, default: 0 },
  tva: { type: Number, default: 7 },
  deliveryFee: { type: Number, default: 0 },
  totalPrice: { type: Number, default: 0 },
  usedCoupon: { type: String, default: "" },
  discountedAmount: { type: Number },
  leftToPayPrice: { type: Number },
  paymentMethod: { type: String, default: "" },
  products: { type: Array, default: [] },
  waiter: { type: String, default: "" },
  table: { type: String, default: "" },
  isPickup: { type: Boolean, default: false },
  pickupCode: { type: String, default: "" },
  customerName: { type: String, default: "" },
  customerComment: { type: String, default: "" },
  restaurant: { type: String, default: "" },
  idJumiaOrder: { type: String, default: "" },
  jumiaStatusFlow: { type: Array, default: [] },
  importedFrom: { type: String, default: "" },
  importedId: { type: String, default: "" },
});

const OrderModel = mongoose.model("Order", Order);
module.exports = OrderModel;
