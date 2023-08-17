const Admin = require("express").Router();

const {
  login,
  createAdmin,
  editProfile,
  viewProfile,
  changePassword,
  getCompanies,
  createCompany,
  editCompany,
  udpateCompany,
  viewCompany,
  createUser,
} = require("../controllers/Admin.controller");
const { isAdmin } = require("../middlewares/Admin/isAdmin");
const { isFeature } = require("../middlewares/Company/isFeature");

const use = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/* Admin Auth */
Admin.get("/auth", use(isAdmin));
Admin.post("/login", use(login));
Admin.post("/createAdmin", use(isAdmin), use(createAdmin));
Admin.put("/editProfile", use(isAdmin), use(editProfile));
Admin.get("/viewProfile", use(isAdmin), use(viewProfile));
Admin.post("/changePassword", use(isAdmin), use(changePassword));

/* CRUD Company */
Admin.get(
  "/getCompanies",
  use(isAdmin),
  // use(isFeature("Company", "read")),
  use(getCompanies)
);
Admin.post(
  "/createCompany",
  use(isAdmin),
  // use(isFeature("Company", "create")),
  use(createCompany)
);
Admin.put(
  "/editCompany/:id",
  use(isAdmin),
  // use(isFeature("Company", "update")),
  use(editCompany)
);
Admin.put(
  "/udpateCompany/:id",
  use(isAdmin),
  // use(isFeature("Company", "update")),
  use(udpateCompany)
);
Admin.get(
  "/viewCompany/:id",
  use(isAdmin),
  // use(isFeature("Company", "read")),
  use(viewCompany)
);

/*CRUD User */
Admin.post(
  "/createUser",
  use(isAdmin),
  // use(isFeature("Employees", "create")),
  use(createUser)
);

module.exports = Admin;
