const mongoose = require("mongoose");
const { Schema } = mongoose;

const Jumia = new Schema({
  id: { type: String, require: true },
  token: { type: String, require: true },
  idCompany: { type: String, require: true },
  createdAt: { type: Date, default: Date.now() },
  email: { type: String, require: true },
  password: { type: String, require: true },
  isActive: { type: Boolean, default: true },
});

const JumiaModel = mongoose.model("Jumia", Jumia);
module.exports = JumiaModel;
