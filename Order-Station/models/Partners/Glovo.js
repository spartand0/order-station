const mongoose = require("mongoose");
const { Schema } = mongoose;

const Glovo = new Schema({
  id: { type: String, require: true },
  token: { type: String, require: true },
  createdAt: { type: Date, default: Date.now() },
  isActive: { type: Boolean, default: true },
});

const GlovoModel = mongoose.model("Glovo", Glovo);
module.exports = GlovoModel;
