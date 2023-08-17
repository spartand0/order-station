const mongoose = require("mongoose");
const { Schema } = mongoose;

const Notification = new Schema({
  id: { type: String, require: true },
  createdAt: { type: String, default: Date.now() },
  title: { type: String, default: "" },
  content: { type: String, default: "" },
  isRead: { type: Boolean, default: false },
  isArchived: { type: Boolean, default: false },
});

const User = new Schema({
  id: { type: String, require: true, index: { unique: true } },
  createdAt: { type: Date, default: Date.now() },
  name: { type: String, require: true },
  surname: { type: String, require: true },
  email: { type: String, require: true, default: "" },
  password: { type: String, require: true },
  cin: { type: String, default: "" },
  birthDate: { type: Date, default: "" },
  phone: { type: Number, require: true },
  isVerified: { type: Boolean, Default: false },
  idCompany: { type: String, default: "" },
  otp: { type: String, default: "" },
  token: { type: String, default: "" },
  role: { type: String, default: "" },
  loginHistory: { type: Array, default: [] },
  transactions: { type: Array, default: [] },
  isArchived: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  paymentHistory: { type: Array, default: [] },
  withdrawHistory: { type: Array, default: [] },
  authMethod: { type: String, default: "regular" },
  photo: { type: String, default: "" },
  // notifications: { type: Array, default: [Notification] },
  cardDetails: {
    cardNumber: { type: String, default: "" },
    expDate: { type: String, default: "" },
    ccv: { type: String, default: "" },
  },
  walletDetails: { type: Object },
});

const UserModel = mongoose.model("User", User);
module.exports = UserModel;
