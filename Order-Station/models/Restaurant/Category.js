const mongoose = require("mongoose");
const { Schema } = mongoose;

const Category = new Schema({
  id: { type: String, require: true },
  idCompany: { type: String, require: true },
  name: { type: String, require: true },
  description: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now() },
  isAvailable: { type: Boolean, default: true },
  isArchived: { type: Boolean, default: false },
  image: { type: String, default: "" },
  priority: { type: Number, default: 1 },
  importedFrom: { type: String, default: "" },
  importedId: { type: String, default: "" },
  restaurants: { type: Array, default: [] },
});

const CategoryModel = mongoose.model("Category", Category);
module.exports = CategoryModel;
