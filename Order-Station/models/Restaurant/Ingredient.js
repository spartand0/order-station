const mongoose = require("mongoose");
const { Schema } = mongoose;

const Ingredient = new Schema({
  id: { type: String, require: true },
  name: { type: String, require: true },
  createdAt: { type: Date, default: Date.now() },
  quantity: { type: Number, default: 0 },
  unit: { type: String, default: "" },
  price: { type: Number, default: 0 },
  purchasedPrice: { type: Number, default: 0 },
  isAvailable: { type: Boolean, default: true },
  isArchived: { type: Boolean, default: false },
  isSupplement: { type: Boolean },
  image: { type: String, default: "" },
  idCompany: { type: String, default: "" },
  restaurants: { type: Array, default: [] },
  products: { type: Array, default: [] },
  importedFrom: { type: String, default: "" },
  importedId: { type: String, default: "" },
  priority: { type: Number, default: 1 },
  visibility: {
    glovo: { type: Boolean },
    jumia: { type: Boolean },
    onPlace: { type: Boolean },
  },
});

const IngredientModel = mongoose.model("Ingredient", Ingredient);
module.exports = IngredientModel;
