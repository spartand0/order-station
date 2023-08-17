const mongoose = require("mongoose");

const { Schema } = mongoose;

const Admin = new Schema({
  id: { type: String, require: true },
  isActive: { type: Boolean, default: true },
  isArchived: { type: Boolean, default: false },
  name: { type: String, require: true },
  surname: { type: String, require: true },
  role: { type: String, require: true },
  email: { type: String, require: true },
  password: { type: String, require: true },
  phone: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now() },
  token: { type: String, default: "" },
  otp: { type: String, default: "" },
  loginHistory: { type: Array, default: [] },
});

const AdminModel = mongoose.model("Admin", Admin);
module.exports = AdminModel;
