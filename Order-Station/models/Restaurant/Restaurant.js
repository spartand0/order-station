const mongoose = require("mongoose");
const { Schema } = mongoose;

// const Notification = new Schema({
//   id: { type: String, require: true },
//   createdAt: { type: String, default: Date.now() },
//   title: { type: String, default: "" },
//   content: { type: String, default: "" },
//   isRead: { type: Boolean, default: false },
//   isArchived: { type: Boolean, default: false },
// });

const Restaurant = new Schema({
  id: { type: String, require: true, index: { unique: true } },
  idCompany: { type: String, require: true },
  createdAt: { type: Date, default: Date.now() },
  name: { type: String, require: true },
  description: { type: String, default: "" },
  specialty: { type: String, require: true },
  address: { type: String, default: "" },
  responsible: { type: String, default: "" },
  email: { type: String, require: true },
  phone: { type: String, default: "" },
  transactions: { type: Array, default: [] },
  isArchived: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  logo: { type: String, default: "" },
  cover: { type: String, default: "" },
  latitude: { type: Number, default: "" },
  longitude: { type: Number, default: "" },
  importedFrom: { type: String, default: "" },
  importedId: { type: String, default: "" },
  visibility: {
    glovo: { type: Boolean },
    jumia: { type: Boolean },
    onPlace: { type: Boolean },
  },
  bankDetails: {
    cardNumber: { type: String, default: "" },
    expDate: { type: String, default: "" },
    ccv: { type: String, default: "" },
  },
  menu: { type: Array, default: [] },
  products: { type: Array, default: [] },
  ingredients: { type: Array, default: [] },
  categories: { type: Array, default: [] },
  coupons: { type: Array, default: [] },
  orders: { type: Array, default: [] },
  tables: { type: Array, default: [] },
  waiters: { type: Array, default: [] },
});

const RestaurantModel = mongoose.model("Restaurant", Restaurant);
module.exports = RestaurantModel;
