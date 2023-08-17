const mongoose = require("mongoose");

const { Schema } = mongoose;

const Payment = new Schema({
  id: { type: String, required: true },
  amount: { type: Number, required: true },
  amountTTC: { type: String, required: true },
  creationDate: { type: Date, default: Date.now() },
  isTrial: { type: Boolean, default: true },
  endOfContract: { type: Date, require: true },
  type: { type: String, require: true }, // wire - online - cash
  status: { type: String, require: true }, //  paid - pending - unpaid
  description: { type: String, default: "" },
  features: { type: Array, default: [] },
});

const PaymentModel = mongoose.model("Payment", Payment);
module.exports = PaymentModel;
