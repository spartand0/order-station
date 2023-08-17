const mongoose = require("mongoose");

const { Schema } = mongoose;

const Company = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true, default: "" },
  address: { type: String, required: true, default: "" },
  email: { type: String, required: true, default: "" },
  createdAt: { type: Date, default: Date.now() },
  image: { type: String, default: "" },
  users: { type: Array, default: [] },
  idJumia: { type: String, default: "" },
  idGlovo: { type: String, default: "" },
  restaurants: { type: Array, default: [] },
  type: { type: String, default: "" },
  matricule: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  isArchived: { type: Boolean, default: false },
  paymentHistory: { type: Array, default: [] },
  orders: { type: Array, default: [] },
  features: { type: Array, default: [] },
});

const CompanyModel = mongoose.model("Company", Company);
module.exports = CompanyModel;
