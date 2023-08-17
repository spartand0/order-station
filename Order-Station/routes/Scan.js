const Scan = require("express").Router();

const {
  getCategories,
  createOrder,
  getOrderDetails,
  getTableStatus,
  getProducts,
  getVendors,
  getProductChoices,
  getProductSupplements,
} = require("../controllers/Scan.controller");

const use = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/* Category*/
Scan.get("/getCategories/:idCompany/:idVendor", use(getCategories));

/* Order */
Scan.post("/createOrder/:idCompany", use(createOrder));
Scan.get("/getOrderDetails/:idCompany/:idOrder", use(getOrderDetails));
Scan.get("/getTableStatus/:idCompany/:idTable", use(getTableStatus));

/* Vendor*/
Scan.get("/getVendors/:idCompany", use(getVendors));

/* Products */
Scan.get("/getProducts/:idCompany/:idVendor", use(getProducts));
Scan.get("/getProductChoices/:idCompany/:idProduct", use(getProductChoices));
Scan.get(
  "/getProductSupplements/:idCompany/:idProduct",
  use(getProductSupplements)
);

module.exports = Scan;
