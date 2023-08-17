const mongoose = require("mongoose");
const { Schema } = mongoose;

const Table = new Schema({
  id: { type: String, require: true },
  tableNumber: { type: Number, require: true },
  idCompany: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now() },
  isAvailable: { type: Boolean, default: true },
  isArchvied: { type: Boolean, default: false },
  qrcode: { type: String, default: "" },
  restaurant: { type: String, default: "" },
  waiter: { type: String, default: "" },
  order: { type: String, default: "" },
});

const TableModel = mongoose.model("Table", Table);
module.exports = TableModel;
