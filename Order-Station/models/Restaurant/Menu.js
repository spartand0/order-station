const mongoose = require("mongoose");
const { Schema } = mongoose;

const Menu = new Schema({
  id: { type: String, require: true },
  name: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now() },
  isActive: { type: Boolean, default: true },
  isArchived: { type: Boolean, default: false },
  image: { type: String, default: "" },
  restaurant: { type: String, default: "" },
  categories: { type: Array, default: [] },
});

const MenuModel = mongoose.model("Menu", Menu);
module.exports = MenuModel;
