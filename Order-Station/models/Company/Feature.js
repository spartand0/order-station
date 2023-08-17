const mongoose = require("mongoose");

const { Schema } = mongoose;

const Feature = new Schema({
  id: { type: String, require: true },
  isActive: { type: Boolean, default: true },
  isArchived: { type: Boolean, default: false },
  name: { type: String, require: true },
  description: { type: String, require: true },
  canCreate: { type: Boolean, default: true },
  canRead: { type: Boolean, default: true },
  canUpdate: { type: Boolean, default: true },
  canDelete: { type: Boolean, default: true },
});

const FeatureModel = mongoose.model("Feature", Feature);
module.exports = FeatureModel;
