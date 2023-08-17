const User = require("express").Router();

const {
  login,
  getOrders,
  getOrderDetails,
  updateStatus,
  createVendor,
  getVendors,
  editVendor,
  archiveVendor,
  updateVendor,
  test,
  addIngredient,
  getIngredients,
  editIngredient,
  archiveIngredient,
  restoreIngredient,
  restoreVendor,
  getSupplements,
  addProduct,
  getProducts,
  editProduct,
  archiveProduct,
  restoreProduct,
  getProductIngredients,
  addCategory,
  getCategories,
  editCategory,
  archiveCategory,
  restoreCategory,
  getSuitableProducts,
  editProfile,
  viewProfile,
  changePassword,
  getVendorCategories,
  getVendorIngredients,
  getVendorProducts,
  getProduct,
  editSupplement,
  addTable,
  getTables,
  getTable,
  editTable,
  archiveTable,
  restoreTable,
  updateTableStatus,
  getVendor,
  addWaiter,
  getWaiters,
  getWaiter,
  editWaiter,
  archiveWaiter,
  restoreWaiter,
  createCoupon,
  getCoupons,
  getCoupon,
  editCoupon,
  archiveCoupon,
  restoreCoupon,
  importJumiaOrders,
  getProductSupplements,
  getVendorSupplements,
  jumiaLogin,
  importJumiaCategories,
  importJumiaIngredients,
  importJumiaProducts,
  importJumiaVendors,
  importJumiaSupplements,
} = require("../controllers/User.controller");
const { isUser } = require("../middlewares/User/isUser");

const use = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
/* User Auth */
User.post("/login", use(login));
User.post("/test", use(test));
User.put("/editProfile", use(isUser), use(editProfile));
User.get("/viewProfile", use(isUser), use(viewProfile));
User.post("/changePassword", use(isUser), use(changePassword));

/* CRUD Vendor*/
User.post("/createVendor", use(isUser), use(createVendor));
User.get("/getVendors", use(isUser), use(getVendors));
User.get("/getVendor/:id", use(isUser), use(getVendor));
User.get("/getVendorCategories/:id", use(isUser), use(getVendorCategories));
User.get("/getVendorIngredients/:id", use(isUser), use(getVendorIngredients));
User.get("/getVendorSupplements/:id", use(isUser), use(getVendorSupplements));
User.get("/getVendorProducts/:id", use(isUser), use(getVendorProducts));
User.put("/editVendor/:id", use(isUser), use(editVendor));
User.put("/archiveVendor/:id", use(isUser), use(archiveVendor));
User.put("/restoreVendor/:id", use(isUser), use(restoreVendor));
User.put("/updateVendor/:id/:action", use(isUser), use(updateVendor));

/* CRUD Categories*/
User.post("/addCategory", use(isUser), use(addCategory));
User.get("/getCategories", use(isUser), use(getCategories));
User.put("/editCategory/:id", use(isUser), use(editCategory));
User.put("/archiveCategory/:id", use(isUser), use(archiveCategory));
User.put("/restoreCategory/:id", use(isUser), use(restoreCategory));

/* CRUD Ingredients*/
User.post("/addIngredient", use(isUser), use(addIngredient));
User.get("/getIngredients", use(isUser), use(getIngredients));
User.get("/getSupplements", use(isUser), use(getSupplements));
User.get("/getSuitableProducts/:id", use(isUser), use(getSuitableProducts));
User.put("/editIngredient/:id", use(isUser), use(editIngredient));
User.put("/editSupplement/:id", use(isUser), use(editSupplement));
User.put("/archiveIngredient/:id", use(isUser), use(archiveIngredient));
User.put("/restoreIngredient/:id", use(isUser), use(restoreIngredient));

/* CRUD Products*/
User.post("/addProduct", use(isUser), use(addProduct));
User.get("/getProducts", use(isUser), use(getProducts));
User.get("/getProduct/:id", use(isUser), use(getProduct));
User.put("/editProduct/:id", use(isUser), use(editProduct));
User.put("/archiveProduct/:id", use(isUser), use(archiveProduct));
User.put("/restoreProduct/:id", use(isUser), use(restoreProduct));
User.get("/getProductIngredients/:id", use(isUser), use(getProductIngredients));
User.get("/getProductSupplements/:id", use(isUser), use(getProductSupplements));

/* CRUD Tables*/
User.post("/addTable", use(isUser), use(addTable));
User.get("/getTables", use(isUser), use(getTables));
User.get("/getTable/:id", use(isUser), use(getTable));
User.put("/editTable/:id", use(isUser), use(editTable));
User.put("/updateTableStatus/:id/:action", use(isUser), use(updateTableStatus));
User.put("/archiveTable/:id", use(isUser), use(archiveTable));
User.put("/restoreTable/:id", use(isUser), use(restoreTable));

/* CRUD Waiters*/
User.post("/addWaiter", use(isUser), use(addWaiter));
User.get("/getWaiters", use(isUser), use(getWaiters));
User.get("/getWaiter/:id", use(isUser), use(getWaiter));
User.put("/editWaiter/:id", use(isUser), use(editWaiter));
User.put("/archiveWaiter/:id", use(isUser), use(archiveWaiter));
User.put("/restoreWaiter/:id", use(isUser), use(restoreWaiter));

/* CRUD Coupons */
User.post("/createCoupon", use(isUser), use(createCoupon));
User.get("/getCoupons", use(isUser), use(getCoupons));
User.get("/getCoupon/:id", use(isUser), use(getCoupon));
User.put("/editCoupon/:id", use(isUser), use(editCoupon));
User.put("/archiveCoupon/:id", use(isUser), use(archiveCoupon));
User.put("/restoreCoupon/:id", use(isUser), use(restoreCoupon));

/* CRUD Orders */
User.get("/getOrders", use(isUser), use(getOrders));

/* Jumia */
User.post("/jumiaLogin", use(isUser), use(jumiaLogin));
User.post("/importJumiaOrders", use(isUser), use(importJumiaOrders));
User.post("/importJumiaVendors", use(isUser), use(importJumiaVendors));
User.post("/importJumiaCategories", use(isUser), use(importJumiaCategories));
User.post("/importJumiaSupplements", use(isUser), use(importJumiaSupplements));
User.post("/importJumiaIngredients", use(isUser), use(importJumiaIngredients));
User.post("/importJumiaProducts", use(isUser), use(importJumiaProducts));

module.exports = User;
