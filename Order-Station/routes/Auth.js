const Auth = require("express").Router();

const {
  resetPassword,
  confirmResetPassword,
} = require("../controllers/Auth.controller");

const use = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

Auth.post("/resetPassword", use(resetPassword));
Auth.post("/confirmResetPassword", use(confirmResetPassword));

module.exports = Auth;
