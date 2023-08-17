const mongoose = require("mongoose");
const { Schema } = mongoose;

const JumiaOrder = new Schema({
  id: { type: String, require: true },
  details: { type: Object },
});

const JumiaOrderModel = mongoose.model("JumiaOrder", JumiaOrder);
module.exports = JumiaOrderModel;
