const UserModel = require("../models/User/User");
const CompanyModel = require("../models/Company/Company");
const OrderModel = require("../models/Restaurant/Order");
const RestaurantModel = require("../models/Restaurant/Restaurant");
const IngredientModel = require("../models/Restaurant/Ingredient");
const ProductModel = require("../models/Restaurant/Product");
const CategoryModel = require("../models/Restaurant/Category");
const TableModel = require("../models/Restaurant/Table");
const CouponModel = require("../models/Restaurant/Coupon");
const JumiaModel = require("../models/Partners/Jumia");
const JumiaOrderModel = require("../models/Partners/JumiaOrder");
const parser = require("ua-parser-js");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const { decryptData, encryptData } = require("../functions/encryptionUtils");
const {
  formatCategory,
  formatOrder,
  formatProducts,
  formatVendor,
  formatIngredient,
  formatSupplement,
} = require("../functions/formatterUtils.js");
const { default: axios } = require("axios");
const { fetchAndEmitOrders } = require("../functions/socketFetchOrders");

async function generateRandomCode() {
  var characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  var code = "";
  for (var i = 0; i < 6; i++) {
    var randomIndex = Math.floor(Math.random() * characters.length);
    code += characters.charAt(randomIndex);
  }

  return code;
}
exports.test = async (req, res) => {
  try {
    return res.status(200).send({
      message: "Success",
      code: 200,
      success: false,
      date: Date.now(),
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      message:
        "This error is coming from test endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email) {
      return res.status(400).send({
        message: "Please provide a valid user !",
        code: 400,
        requestDate: Date.now(),
        success: false,
      });
    }
    const foundUser = await UserModel.findOne({
      email,
      isArchived: false,
      isActive: true,
    });
    const ua = parser(req.headers["user-agent"]);

    if (!foundUser) {
      return res.status(404).send({
        message:
          "This user dosent exist in the database , please verify and send again",
        code: 404,
        requestDate: Date.now(),
        success: false,
      });
    }
    if (!foundUser.isActive)
      return res.status(401).send({
        message:
          "Your account has been disabled. Please contact support for more informations.",
        code: 401,
        requestDate: Date.now(),
        success: false,
      });
    bcrypt.compare(password, foundUser.password, async (err, data) => {
      //if error than throw error
      if (err) throw err;

      //if both match than you can do anything
      if (data) {
        foundUser.loginHistory.push({
          date: Date.now(),
          device: ua,
          ip: req.ip,
          success: true,
        });

        const token = jwt.sign(
          { id: foundUser.id, email, role: foundUser.role },
          process.env.SECRET_KEY,
          {
            expiresIn: "24h",
          }
        );
        foundUser.save();

        return res.status(200).json({
          message: "Login success",
          code: 200,
          success: true,
          date: Date.now(),
          token,
        });
      } else {
        foundUser.loginHistory.push({
          date: Date.now(),
          device: ua,
          ip: req.ip,
          success: false,
        });
        await foundUser.save();

        return res
          .status(401)
          .json({ message: "Invalid credential", code: 401, success: false });
      }
    });
  } catch (err) {
    res.status(500).send({
      message:
        "This error is coming from login endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.viewProfile = async (req, res) => {
  try {
    const token = req.headers["x-order-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);
    let foundUser = await UserModel.findOne({ id: user.id }).select(
      "-password -loginHistory -__v -_id -isActive -isArchived"
    );
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    res.status(200).send({
      message: "Fetched profile",
      code: 200,
      success: true,
      date: Date.now(),
      data: foundUser,
    });
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from viewProfile endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.editProfile = async (req, res) => {
  try {
    const token = req.headers["x-order-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);
    const values = req.body;

    if (values.email) {
      const foundEmail = await UserModel.findOne({ email: values.email });
      if (foundEmail)
        return res.status(406).send({
          message: "Email already in use",
          code: 406,
          success: false,
          date: Date.now(),
        });
    }

    const foundUser = await UserModel.findOneAndUpdate(
      {
        id: user.id,
      },
      { $set: values },
      { new: true }
    );
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    res.status(200).send({
      message: "Updated profile details",
      code: 200,
      success: true,
      date: Date.now(),
    });
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from editProfile endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const token = req.headers["x-order-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);
    const foundUser = await UserModel.findOne({
      id: user.id,
    });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const { newPassword, currentPassword, confirmNewPassword } = req.body;
    if (newPassword === confirmNewPassword) {
      const testCurrentPass = await bcrypt.compare(
        currentPassword,
        foundUser.password
      );
      if (testCurrentPass) {
        const testNewPass = await bcrypt.compare(
          newPassword,
          foundUser.password
        );
        if (!testNewPass) {
          foundUser.password = await bcrypt.hash(newPassword, 10);
          foundUser.save();
          return res.status(200).send({
            code: 200,
            message: "Password changed successfully",
            success: true,
            date: Date.now(),
          });
        } else {
          res.status(406).send({
            code: 406,
            message: "Your new password cannot be your old one",
            success: false,
            date: Date.now(),
          });
        }
      } else {
        res.status(406).send({
          code: 406,
          message: "Password doesn't match your current one",
          success: false,
          date: Date.now(),
        });
      }
    } else {
      res.status(406).send({
        code: 406,
        message: "Your new passwords don't match",
        success: false,
        date: Date.now(),
      });
    }
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from changePassword endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.getOrders = async (req, res) => {
  try {
    const token = req.headers["x-order-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);

    const foundUser = await UserModel.findOne({
      id: user.id,
    });
    const foundCompany = await CompanyModel.findOne({
      id: foundUser.idCompany,
    });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    if (!foundCompany || !foundCompany.users.includes(foundUser.id)) {
      return res.status(404).send({
        message: "You don't belong to a company",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const foundOrders = await OrderModel.find({
      id: foundCompany.id,
    }).select("-__v -_id -products");

    res.status(200).send({
      message: "Fetched orders",
      code: 200,
      success: true,
      date: Date.now(),
      data: foundOrders,
    });
    setInterval(fetchAndEmitOrders, 2000);
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from getOrders endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.viewOrder = async (req, res) => {
  try {
    const token = req.headers["x-order-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);

    const foundUser = await UserModel.findOne({
      id: user.id,
    });
    const foundCompany = await CompanyModel.findOne({
      id: foundUser.idCompany,
    });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    if (!foundCompany || !foundCompany.users.includes(foundUser.id)) {
      return res.status(404).send({
        message: "You don't belong to a company",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const id = req.params["id"];
    const foundOrder = await OrderModel.findOne({
      id,
      restaurant: foundCompany.id,
    }).select("-__v -_id");
    if (!foundOrder) {
      return res.status(404).send({
        message: "Order not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    return res.status(200).send({
      message: "Fetched order",
      code: 200,
      success: true,
      date: Date.now(),
      data: foundOrder,
    });
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from viewOrder endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const token = req.headers["x-order-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);

    const foundUser = await UserModel.findOne({
      id: user.id,
    });
    const foundCompany = await CompanyModel.findOne({
      id: foundUser.idCompany,
    });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    if (!foundCompany || !foundCompany.users.includes(foundUser.id)) {
      return res.status(404).send({
        message: "You don't belong to a company",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const id = req.params["id"];
    const foundOrder = await OrderModel.findOne({
      id,
      restaurant: foundCompany.id,
    }).select("-__v -_id");
    if (!foundOrder) {
      return res.status(404).send({
        message: "Order not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    if (foundOrder.status === "New") {
      return res.status(200).send({
        message: "Fetched order",
        code: 200,
        success: true,
        date: Date.now(),
        data: foundOrder,
      });
    } else if (foundOrder.status === "Ready") {
      return res.status(200).send({
        message: "Fetched order",
        code: 200,
        success: true,
        date: Date.now(),
        data: foundOrder,
      });
    } else {
      return res.status(200).send({
        message: "Fetched order",
        code: 200,
        success: true,
        date: Date.now(),
        data: foundOrder,
      });
    }
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from updateStatus endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.createVendor = async (req, res) => {
  try {
    const token = req.headers["x-order-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);

    const foundUser = await UserModel.findOne({
      id: user.id,
    });
    const foundCompany = await CompanyModel.findOne({
      id: foundUser.idCompany,
    });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    if (!foundCompany || !foundCompany.users.includes(foundUser.id)) {
      return res.status(404).send({
        message: "You don't belong to a company",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    if (
      foundCompany.type === "monobrand" &&
      foundCompany.restaurants.length === 1
    ) {
      return res.status(401).send({
        message:
          "Your company is monobrand only, you cannot add more restaurants",
        code: 401,
        success: false,
        date: Date.now(),
      });
    }
    let values = req.body;
    const idRestaurant = uuidv4();
    values.idCompany = foundCompany.id;
    values.id = idRestaurant;
    let newRestaurant = new RestaurantModel(values);
    foundCompany.restaurants.push(idRestaurant);
    await newRestaurant.save();
    await foundCompany.save();
    res.status(200).send({
      message: "Created restaurant",
      code: 200,
      success: true,
      date: Date.now(),
      data: newRestaurant,
    });
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from createVendor endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.getVendorCategories = async (req, res) => {
  try {
    const token = req.headers["x-order-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);

    const foundUser = await UserModel.findOne({
      id: user.id,
    });
    const foundCompany = await CompanyModel.findOne({
      id: foundUser.idCompany,
    });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    if (!foundCompany || !foundCompany.users.includes(foundUser.id)) {
      return res.status(404).send({
        message: "You don't belong to a company",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const { id } = req.params;
    const foundRestaurant = await RestaurantModel.findOne({
      id,
      isArchived: false,
      idCompany: foundCompany.id,
    });
    if (
      !foundRestaurant ||
      !foundCompany.restaurants.includes(foundRestaurant.id)
    ) {
      return res.status(404).send({
        message: "Vendor not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const foundCategories = await CategoryModel.find({
      id: { $in: foundRestaurant.categories },
      isArchived: false,
      idCompany: foundCompany.id,
    }).select("-_id -__v");
    if (foundCategories && foundCategories[0]) {
      return res.status(200).send({
        message: "Fetched categories",
        code: 200,
        success: true,
        date: Date.now(),
        data: foundCategories,
      });
    } else {
      res.status(200).send({
        message: "No categories",
        code: 200,
        success: true,
        date: Date.now(),
        data: [],
      });
    }
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from getVendorCategories endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.getVendorProducts = async (req, res) => {
  try {
    const token = req.headers["x-order-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);

    const foundUser = await UserModel.findOne({
      id: user.id,
    });
    const foundCompany = await CompanyModel.findOne({
      id: foundUser.idCompany,
    });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    if (!foundCompany || !foundCompany.users.includes(foundUser.id)) {
      return res.status(404).send({
        message: "You don't belong to a company",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const { id } = req.params;
    const foundRestaurant = await RestaurantModel.findOne({
      id,
      isArchived: false,
      idCompany: foundCompany.id,
    });
    if (
      !foundRestaurant ||
      !foundCompany.restaurants.includes(foundRestaurant.id)
    ) {
      return res.status(404).send({
        message: "Vendor not found or doesn't belong to your company",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const foundProducts = await ProductModel.find({
      id: { $in: foundRestaurant.products },
      isArchived: false,
      idCompany: foundCompany.id,
    }).select("-_id -__v");
    if (foundProducts && foundProducts[0]) {
      return res.status(200).send({
        message: "Fetched products",
        code: 200,
        success: true,
        date: Date.now(),
        data: foundProducts,
      });
    } else {
      res.status(200).send({
        message: "No products",
        code: 200,
        success: true,
        date: Date.now(),
        data: [],
      });
    }
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from getVendorProducts endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.editVendor = async (req, res) => {
  try {
    const token = req.headers["x-order-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);

    const foundUser = await UserModel.findOne({
      id: user.id,
    });
    const foundCompany = await CompanyModel.findOne({
      id: foundUser.idCompany,
    });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    if (!foundCompany || !foundCompany.users.includes(foundUser.id)) {
      return res.status(404).send({
        message: "You don't belong to a company",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const { id } = req.params;
    const values = req.body;
    const foundRestaurant = await RestaurantModel.findOneAndUpdate(
      { id },
      { $set: values },
      { new: true }
    );
    if (!foundRestaurant) {
      return res.status(404).send({
        message: "Vendor not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    res.status(200).send({
      message: "Updated vendor",
      code: 200,
      success: true,
      date: Date.now(),
    });
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from editVendor endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.getVendor = async (req, res) => {
  try {
    const token = req.headers["x-order-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);

    const foundUser = await UserModel.findOne({
      id: user.id,
    });
    const foundCompany = await CompanyModel.findOne({
      id: foundUser.idCompany,
    });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    if (!foundCompany || !foundCompany.users.includes(foundUser.id)) {
      return res.status(404).send({
        message: "You don't belong to a company",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const { id } = req.params;
    const foundRestaurant = await RestaurantModel.findOne({
      id,
      idCompany: foundCompany.id,
      isArchived: false,
    }).select("-_id -__v");
    if (!foundRestaurant) {
      return res.status(404).send({
        message: "Vendor not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    res.status(200).send({
      message: "Fetched vendor",
      code: 200,
      success: true,
      date: Date.now(),
      data: foundRestaurant,
    });
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from getVendor endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.getVendors = async (req, res) => {
  try {
    const token = req.headers["x-order-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);

    const foundUser = await UserModel.findOne({
      id: user.id,
    });
    const foundCompany = await CompanyModel.findOne({
      id: foundUser.idCompany,
    });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    if (!foundCompany || !foundCompany.users.includes(foundUser.id)) {
      return res.status(404).send({
        message: "You don't belong to a company",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }

    const foundRestaurants = await RestaurantModel.find({
      id: { $in: foundCompany.restaurants },
      idCompany: foundCompany.id,
      isArchived: false,
    }).select("-__v -_id -transactions -orders -tables -coupons -ingredients");
    if (foundRestaurants && foundRestaurants[0]) {
      res.status(200).send({
        message: "Fetched vendors",
        code: 200,
        success: true,
        date: Date.now(),
        data: foundRestaurants,
      });
    } else {
      res.status(200).send({
        message: "No vendors",
        code: 200,
        success: true,
        date: Date.now(),
        data: [],
      });
    }
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from getVendors endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.archiveVendor = async (req, res) => {
  try {
    const token = req.headers["x-order-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);

    const foundUser = await UserModel.findOne({
      id: user.id,
    });
    const foundCompany = await CompanyModel.findOne({
      id: foundUser.idCompany,
    });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    if (!foundCompany || !foundCompany.users.includes(foundUser.id)) {
      return res.status(404).send({
        message: "You don't belong to a company",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }

    const { id } = req.params;
    const foundRestaurant = await RestaurantModel.findOneAndUpdate(
      {
        id,
        idCompany: foundCompany.id,
        isArchived: false,
      },
      { isArchived: true }
    );
    if (!foundRestaurant) {
      return res.status(404).send({
        message: "Vendor not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const newVendorList = foundCompany.restaurants.filter(
      (idVendor) => idVendor !== id
    );
    foundCompany.restaurants = newVendorList;
    await foundCompany.save();
    res.status(200).send({
      message: "Archived vendor",
      code: 200,
      success: true,
      date: Date.now(),
    });
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from archiveVendor endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.restoreVendor = async (req, res) => {
  try {
    const token = req.headers["x-order-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);

    const foundUser = await UserModel.findOne({
      id: user.id,
    });
    const foundCompany = await CompanyModel.findOne({
      id: foundUser.idCompany,
    });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    if (!foundCompany || !foundCompany.users.includes(foundUser.id)) {
      return res.status(404).send({
        message: "You don't belong to a company",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const { id } = req.params;
    const foundRestaurant = await RestaurantModel.findOneAndUpdate(
      {
        id,
        idCompany: foundCompany.id,
        isArchived: true,
      },
      { isArchived: false }
    );
    if (!foundRestaurant) {
      return res.status(404).send({
        message: "Vendor not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    foundCompany.restaurants.push(id);
    await foundCompany.save();
    res.status(200).send({
      message: "Restored vendor",
      code: 200,
      success: true,
      date: Date.now(),
    });
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from restoreVendor endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.updateVendor = async (req, res) => {
  try {
    const token = req.headers["x-order-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);

    const foundUser = await UserModel.findOne({
      id: user.id,
    });
    const foundCompany = await CompanyModel.findOne({
      id: foundUser.idCompany,
    });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    if (!foundCompany || !foundCompany.users.includes(foundUser.id)) {
      return res.status(404).send({
        message: "You don't belong to a company",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const { id, action } = req.params;
    const { platform } = req.body;
    const foundRestaurant = await RestaurantModel.findOne({
      id,
      idCompany: foundCompany.id,
      isArchived: false,
    });
    if (!foundRestaurant) {
      return res.status(404).send({
        message: "Vendor not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    if (action === "open") {
      if (platform === "glovo") {
        foundRestaurant.visibility.glovo = true;
      } else if (platform === "jumia") {
        foundRestaurant.visibility.jumia = true;
      } else {
        foundRestaurant.visibility.onPlace = true;
      }
    } else {
      if (platform === "glovo") {
        foundRestaurant.visibility.glovo = false;
      } else if (platform === "jumia") {
        foundRestaurant.visibility.jumia = false;
      } else {
        foundRestaurant.visibility.onPlace = false;
      }
    }
    await foundRestaurant.save();
    res.status(200).send({
      message: "Updated visibility",
      code: 200,
      success: true,
      date: Date.now(),
    });
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from updateVendor endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.addIngredient = async (req, res) => {
  try {
    const token = req.headers["x-order-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);

    const foundUser = await UserModel.findOne({
      id: user.id,
    });
    const foundCompany = await CompanyModel.findOne({
      id: foundUser.idCompany,
    });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    if (!foundCompany || !foundCompany.users.includes(foundUser.id)) {
      return res.status(404).send({
        message: "You don't belong to a company",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }

    const idIngredient = uuidv4();
    let values = {};
    // Adding supplements
    if (req.body.isSupplement) {
      if (
        !req.body.name ||
        !req.body.price ||
        !req.body.priority ||
        !req.body.restaurants ||
        req.body.restaurants.length === 0
      ) {
        return res.status(400).send({
          message: "Missing details",
          code: 400,
          success: false,
          date: Date.now(),
        });
      }
      values = {
        id: idIngredient,
        idCompany: foundCompany.id,
        name: req.body.name,
        price: req.body.price,
        priority: req.body.priority,
        image: req.body.image,
        products: req.body.products,
        visibility: req.body.visibility,
        isSupplement: true,
      };
    } else {
      if (
        !req.body.name ||
        !req.body.quantity ||
        !req.body.unit ||
        !req.body.purchasedPrice ||
        !req.body.priority ||
        !req.body.restaurants ||
        req.body.restaurants.length === 0
      ) {
        return res.status(400).send({
          message: "Missing details",
          code: 400,
          success: false,
          date: Date.now(),
        });
      }
      values = {
        id: idIngredient,
        idCompany: foundCompany.id,
        name: req.body.name,
        quantity: req.body.quantity,
        purchasedPrice: req.body.purchasedPrice,
        unit: req.body.unit,
        priority: req.body.priority,
        image: req.body.image,
        restaurants: req.body.restaurants,
        visibility: req.body.visibility,
        products: req.body.products,
        isSupplement: false,
      };
    }
    // Check comapny's viability
    if (foundCompany.type === "monobrand" && req.body.restaurants.length > 1) {
      return res.status(401).send({
        message:
          "Your company is Monobrand, you can't assing to more than 1 restaurant",
        code: 401,
        success: false,
        date: Date.now(),
      });
    }
    // Check restuarant's viability
    if (req.body.restaurants && req.body.restaurants[0]) {
      let exist = true;
      const myPromise = req.body.restaurants.map(async (idVendor) => {
        const foundVendor = await RestaurantModel.findOne({
          id: idVendor,
          idCompany: foundCompany.id,
          isArchived: false,
        });
        if (
          !foundVendor ||
          !foundCompany.restaurants.includes(foundVendor.id)
        ) {
          return (exist = false);
        }
      });
      await Promise.all(myPromise);
      if (!exist) {
        return res.status(404).send({
          message:
            "A restaurant in the list wasn't found or doesn't belong to your company",
          code: 404,
          success: false,
          date: Date.now(),
        });
      }
    }
    // Check product's viability
    if (req.body.products && req.body.products[0]) {
      let exist = true;
      const myPromise = req.body.products.map(async (idProduct) => {
        const foundProduct = await ProductModel.findOne({
          id: idProduct,
          idCompany: foundCompany.id,
          isArchived: false,
        });
        if (!foundProduct) {
          return (exist = false);
        }
      });
      await Promise.all(myPromise);
      if (!exist) {
        return res.status(404).send({
          message:
            "A product in the list wasn't found or doesn't belong to your company",
          code: 404,
          success: false,
          date: Date.now(),
        });
      }
    }
    let newIngredient = new IngredientModel(values);

    await newIngredient.save();
    res.status(200).send({
      message: "Created ingredient",
      code: 200,
      success: true,
      date: Date.now(),
      data: newIngredient,
    });
    let Promise1, Promise2;

    Promise1 = req.body.restaurants.map(async (idVendor) => {
      const foundVendor = await RestaurantModel.findOne({
        id: idVendor,
        idCompany: foundCompany.id,
        isArchived: false,
      });

      foundVendor.ingredients.push(idIngredient);
      await foundVendor.save();
    });
    if (req.body.products && req.body.products[0]) {
      Promise2 = req.body.products.map(async (idProduct) => {
        const foundProduct = await ProductModel.findOne({
          id: idProduct,
          idCompany: foundCompany.id,
          isArchived: false,
        });

        if (req.body.isSupplement) {
          foundProduct.supplements.push(idIngredient);
          await foundProduct.save();
        }
      });
    }

    await Promise.all(Promise1, Promise2);
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from addIngredient endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.getIngredients = async (req, res) => {
  try {
    const token = req.headers["x-order-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);

    const foundUser = await UserModel.findOne({
      id: user.id,
    });
    const foundCompany = await CompanyModel.findOne({
      id: foundUser.idCompany,
    });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    if (!foundCompany || !foundCompany.users.includes(foundUser.id)) {
      return res.status(404).send({
        message: "You don't belong to a company",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }

    const foundIngredients = await IngredientModel.find({
      idCompany: foundCompany.id,
      isArchived: false,
      isSupplement: false,
    }).select("-__v -_id ");
    if (foundIngredients && foundIngredients[0]) {
      res.status(200).send({
        message: "Fetched ingredients",
        code: 200,
        success: true,
        date: Date.now(),
        data: foundIngredients,
      });
    } else {
      res.status(200).send({
        message: "No ingredients",
        code: 200,
        success: true,
        date: Date.now(),
        data: [],
      });
    }
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from getIngredients endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.getVendorIngredients = async (req, res) => {
  try {
    const token = req.headers["x-order-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);

    const foundUser = await UserModel.findOne({
      id: user.id,
    });
    const foundCompany = await CompanyModel.findOne({
      id: foundUser.idCompany,
    });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    if (!foundCompany || !foundCompany.users.includes(foundUser.id)) {
      return res.status(404).send({
        message: "You don't belong to a company",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const { id } = req.params;
    const foundVendor = await RestaurantModel.findOne({
      id,
      idCompany: foundCompany.id,
      isArchived: false,
    }).select("-__v -_id ");
    if (!foundVendor) {
      return res.status(404).send({
        message: "Vendor not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    } else if (!foundCompany.restaurants.includes(foundVendor.id)) {
      return res.status(404).send({
        message: "Vendor doesn't belong to your company",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }

    const foundIngredients = await IngredientModel.find({
      id: { $in: foundVendor.ingredients },
      idCompany: foundCompany.id,
      isArchived: false,
      isSupplement: false,
    }).select("-__v -_id ");
    if (foundIngredients && foundIngredients[0]) {
      res.status(200).send({
        message: "Fetched ingredients",
        code: 200,
        success: true,
        date: Date.now(),
        data: foundIngredients,
      });
    } else {
      res.status(200).send({
        message: "No ingredients",
        code: 200,
        success: true,
        date: Date.now(),
        data: [],
      });
    }
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from getVendorIngredients endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.getSupplements = async (req, res) => {
  try {
    const token = req.headers["x-order-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);

    const foundUser = await UserModel.findOne({
      id: user.id,
    });
    const foundCompany = await CompanyModel.findOne({
      id: foundUser.idCompany,
    });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    if (!foundCompany || !foundCompany.users.includes(foundUser.id)) {
      return res.status(404).send({
        message: "You don't belong to a company",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }

    const foundSupplements = await IngredientModel.find({
      idCompany: foundCompany.id,
      isArchived: false,
      isSupplement: true,
    }).select("-__v -_id ");
    if (foundSupplements && foundSupplements[0]) {
      res.status(200).send({
        message: "Fetched supplements",
        code: 200,
        success: true,
        date: Date.now(),
        data: foundSupplements,
      });
    } else {
      res.status(200).send({
        message: "No supplements",
        code: 200,
        success: true,
        date: Date.now(),
        data: [],
      });
    }
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from getSupplements endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.getVendorSupplements = async (req, res) => {
  try {
    const token = req.headers["x-order-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);

    const foundUser = await UserModel.findOne({
      id: user.id,
    });
    const foundCompany = await CompanyModel.findOne({
      id: foundUser.idCompany,
    });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    if (!foundCompany || !foundCompany.users.includes(foundUser.id)) {
      return res.status(404).send({
        message: "You don't belong to a company",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const { id } = req.params;
    const foundVendor = await RestaurantModel.findOne({
      id,
      idCompany: foundCompany.id,
      isArchived: false,
    }).select("-__v -_id ");
    if (!foundVendor || !foundCompany.restaurants.includes(foundVendor.id)) {
      return res.status(404).send({
        message: "Vendor not found or doesn't belong to your company",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }

    const foundSupplements = await IngredientModel.find({
      id: { $in: foundVendor.ingredients },
      idCompany: foundCompany.id,
      isArchived: false,
      isSupplement: true,
    }).select("-__v -_id ");
    if (foundSupplements && foundSupplements[0]) {
      res.status(200).send({
        message: "Fetched supplements",
        code: 200,
        success: true,
        date: Date.now(),
        data: foundSupplements,
      });
    } else {
      res.status(200).send({
        message: "No supplements",
        code: 200,
        success: true,
        date: Date.now(),
        data: [],
      });
    }
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from getVendorSupplements endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};
exports.getSuitableProducts = async (req, res) => {
  try {
    const token = req.headers["x-order-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);

    const foundUser = await UserModel.findOne({
      id: user.id,
    });
    const foundCompany = await CompanyModel.findOne({
      id: foundUser.idCompany,
    });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    if (!foundCompany || !foundCompany.users.includes(foundUser.id)) {
      return res.status(404).send({
        message: "You don't belong to a company",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const { id } = req.params;
    const foundSupplement = await IngredientModel.findOne({
      id,
      idCompany: foundCompany.id,
      isArchived: false,
    }).select("-__v -_id ");
    if (!foundSupplement) {
      return res.status(404).send({
        message: "Supplement not found",
        code: 404,
        success: true,
        date: Date.now(),
      });
    }

    const foundProducts = await ProductModel.find({
      idCompany: foundCompany.id,
      id: { $in: foundSupplement.products },
      isArchived: false,
    }).select("-__v -_id");
    res.status(200).send({
      message: "Fetched suitable products",
      code: 200,
      success: true,
      date: Date.now(),
      data: foundProducts,
    });
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from getSuitableProducts endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.archiveIngredient = async (req, res) => {
  try {
    const token = req.headers["x-order-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);

    const foundUser = await UserModel.findOne({
      id: user.id,
    });
    const foundCompany = await CompanyModel.findOne({
      id: foundUser.idCompany,
    });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    if (!foundCompany || !foundCompany.users.includes(foundUser.id)) {
      return res.status(404).send({
        message: "You don't belong to a company",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const { id } = req.params;
    const foundIngredient = await IngredientModel.findOneAndUpdate(
      {
        id,
        idCompany: foundCompany.id,
        isArchived: false,
      },
      { isArchived: true }
    );
    if (!foundIngredient) {
      return res.status(404).send({
        message: "Ingredient not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    res.status(200).send({
      message: "Archived ingredient",
      code: 200,
      success: true,
      date: Date.now(),
    });
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from archiveIngredient endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.editIngredient = async (req, res) => {
  try {
    const token = req.headers["x-order-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);

    const foundUser = await UserModel.findOne({
      id: user.id,
    });
    const foundCompany = await CompanyModel.findOne({
      id: foundUser.idCompany,
    });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    if (!foundCompany || !foundCompany.users.includes(foundUser.id)) {
      return res.status(404).send({
        message: "You don't belong to a company",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const { id } = req.params;
    const foundIngredient = await IngredientModel.findOne({
      id,
      isSupplement: false,
      isArchived: false,
      idCompany: foundCompany.id,
    });
    if (!foundIngredient) {
      return res.status(404).send({
        message: "Ingredient not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }

    const values = req.body;
    if (values.restaurants && values.restaurants[0]) {
      if (foundCompany.type === "monobrand" && values.restaurants.length > 1) {
        return res.status(401).send({
          message:
            "Your company is Monobrand, you can't assing to more than 1 restaurant",
          code: 401,
          success: false,
          date: Date.now(),
        });
      }

      let exist = true;
      const myPromise = values.restaurants.map(async (idVendor) => {
        const foundVendor = await RestaurantModel.findOne({
          id: idVendor,
          idCompany: foundCompany.id,
          isArchived: false,
        });
        if (
          !foundVendor ||
          !foundCompany.restaurants.includes(foundVendor.id)
        ) {
          return (exist = false);
        }
        if (!foundVendor.ingredients.includes(id)) {
          foundVendor.ingredients.push(id);
          await foundVendor.save();
        }
      });
      await Promise.all(myPromise);
      if (!exist) {
        return res.status(404).send({
          message:
            "A restaurant in the list wasn't found or doesn't belong to your company",
          code: 404,
          success: false,
          date: Date.now(),
        });
      }
    }
    if (values.products && values.products[0]) {
      let exist = true;
      const myPromise = values.products.map(async (idProduct) => {
        const foundProduct = await ProductModel.findOne({
          id: idProduct,
          idCompany: foundCompany.id,
          isArchived: false,
        });
        if (!foundProduct) {
          return (exist = false);
        }
        if (!foundProduct.defaultIngredients.includes(id)) {
          foundProduct.defaultIngredients.push(id);
          await foundProduct.save();
        }
      });
      await Promise.all(myPromise);
      if (!exist) {
        return res.status(404).send({
          message:
            "A product in the list wasn't found or doesn't belong to your company",
          code: 404,
          success: false,
          date: Date.now(),
        });
      }
    }
    await foundIngredient.updateOne(values);
    res.status(200).send({
      message: "Updated ingredient",
      code: 200,
      success: true,
      date: Date.now(),
    });
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from editIngredient endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.editSupplement = async (req, res) => {
  try {
    const token = req.headers["x-order-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);

    const foundUser = await UserModel.findOne({
      id: user.id,
    });
    const foundCompany = await CompanyModel.findOne({
      id: foundUser.idCompany,
    });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    if (!foundCompany || !foundCompany.users.includes(foundUser.id)) {
      return res.status(404).send({
        message: "You don't belong to a company",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const { id } = req.params;
    const values = req.body;
    const foundIngredient = await IngredientModel.findOne({
      id,
      isSupplement: true,
      isArchived: false,
      idCompany: foundCompany.id,
    });
    if (!foundIngredient) {
      return res.status(404).send({
        message: "Supplement not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    if (values.restaurants && values.restaurants[0]) {
      if (foundCompany.type === "monobrand" && values.restaurants.length > 1) {
        return res.status(401).send({
          message:
            "Your company is Monobrand, you can't assing to more than 1 restaurant",
          code: 401,
          success: false,
          date: Date.now(),
        });
      }

      let exist = true;
      const myPromise = values.restaurants.map(async (idVendor) => {
        const foundVendor = await RestaurantModel.findOne({
          id: idVendor,
          idCompany: foundCompany.id,
          isArchived: false,
        });
        if (
          !foundVendor ||
          !foundCompany.restaurants.includes(foundVendor.id)
        ) {
          return (exist = false);
        }
        if (!foundVendor.ingredients.includes(id)) {
          foundVendor.ingredients.push(id);
          await foundVendor.save();
        }
      });
      await Promise.all(myPromise);
      if (!exist) {
        return res.status(404).send({
          message:
            "A restaurant in the list wasn't found or doesn't belong to your company",
          code: 404,
          success: false,
          date: Date.now(),
        });
      }
    }
    if (values.products && values.products[0]) {
      let exist = true;
      const myPromise = values.products.map(async (idProduct) => {
        const foundProduct = await ProductModel.findOne({
          id: idProduct,
          idCompany: foundCompany.id,
          isArchived: false,
        });
        if (!foundProduct) {
          return (exist = false);
        }
        if (!foundProduct.supplements.includes(id)) {
          foundProduct.supplements.push(id);
          await foundProduct.save();
        }
      });
      await Promise.all(myPromise);
      if (!exist) {
        return res.status(404).send({
          message:
            "A product in the list wasn't found or doesn't belong to your company",
          code: 404,
          success: false,
          date: Date.now(),
        });
      }
    }
    await foundIngredient.updateOne(values);
    res.status(200).send({
      message: "Updated supplement",
      code: 200,
      success: true,
      date: Date.now(),
    });
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from editSupplement endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.restoreIngredient = async (req, res) => {
  try {
    const token = req.headers["x-order-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);

    const foundUser = await UserModel.findOne({
      id: user.id,
    });
    const foundCompany = await CompanyModel.findOne({
      id: foundUser.idCompany,
    });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    if (!foundCompany || !foundCompany.users.includes(foundUser.id)) {
      return res.status(404).send({
        message: "You don't belong to a company",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const { id } = req.params;
    const foundIngredient = await IngredientModel.findOneAndUpdate(
      {
        id,
        idCompany: foundCompany.id,
        isArchived: true,
      },
      { isArchived: false }
    );
    if (!foundIngredient) {
      return res.status(404).send({
        message: "Ingredient not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    res.status(200).send({
      message: "Restored ingredient",
      code: 200,
      success: true,
      date: Date.now(),
    });
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from restoreIngredient endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.addProduct = async (req, res) => {
  try {
    const token = req.headers["x-order-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);

    const foundUser = await UserModel.findOne({
      id: user.id,
    });
    const foundCompany = await CompanyModel.findOne({
      id: foundUser.idCompany,
    });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    if (!foundCompany || !foundCompany.users.includes(foundUser.id)) {
      return res.status(404).send({
        message: "You don't belong to a company",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }

    let {
      name,
      description,
      composable,
      category,
      visibility,
      choices,
      price,
      promoPrice,
      image,
      restaurants,
      defaultIngredients,
      priority,
      supplements,
    } = req.body;
    if (
      !name ||
      (composable !== true && composable !== false) ||
      !category ||
      !price ||
      !restaurants ||
      !priority ||
      restaurants.length === 0
    ) {
      return res.status(400).send({
        message: "Missing details",
        code: 400,
        success: false,
        date: Date.now(),
      });
    }
    if (foundCompany.type === "monobrand" && restaurants.length > 1) {
      return res.status(401).send({
        message:
          "Your company is Monobrand, you can't assing to more than 1 restaurant",
        code: 401,
        success: false,
        date: Date.now(),
      });
    }
    const foundCategory = await CategoryModel.findOne({
      id: category,
      idCompany: foundCompany.id,
      isArchived: false,
    });
    if (!foundCategory)
      return res.status(404).send({
        message: "Category not found",
        code: 404,
        success: false,
        date: Date.now(),
      });

    const idProduct = uuidv4();

    if (restaurants && restaurants[0]) {
      let exist = true;
      const myPromise = restaurants.map(async (idVendor) => {
        const foundVendor = await RestaurantModel.findOne({
          id: idVendor,
          idCompany: foundCompany.id,
          isArchived: false,
        });
        if (
          !foundVendor ||
          !foundVendor.categories.includes(category) ||
          !foundCompany.restaurants.includes(foundVendor.id)
        ) {
          return (exist = false);
        }
      });
      await Promise.all(myPromise);
      if (!exist) {
        return res.status(404).send({
          message:
            "A restaurant in the list wasn't found or doesn't belong to your company",
          code: 404,
          success: false,
          date: Date.now(),
        });
      }
    }
    let foodCost = 0;
    if (defaultIngredients && defaultIngredients[0]) {
      let exist = true;
      const myPromise = defaultIngredients.map(async (ingredient) => {
        const foundIngredient = await IngredientModel.findOne({
          id: ingredient.ingredient,
          isSupplement: false,
          idCompany: foundCompany.id,
          isArchived: false,
        });
        if (!foundIngredient) {
          return (exist = false);
        }
        foodCost += foundIngredient.purchasedPrice * ingredient.quantity;
        ingredient.price = foundIngredient.purchasedPrice * ingredient.quantity;
      });
      await Promise.all(myPromise);
      if (!exist) {
        return res.status(404).send({
          message: "An ingredient in the list wasn't found",
          code: 404,
          success: false,
          date: Date.now(),
        });
      }
    }
    if (foodCost > price) {
      return res.status(406).send({
        message: "The price isn't optimal considering its food cost",
        code: 406,
        success: false,
        date: Date.now(),
      });
    }
    if (choices && choices[0]) {
      let exist = true;
      const myPromise = choices.map(async (choice) => {
        for (let ingredient of choice.ingredients) {
          const foundIngredient = await IngredientModel.findOne({
            id: ingredient,
            isSupplement: false,
            idCompany: foundCompany.id,
            isArchived: false,
          });
          if (!foundIngredient) {
            return (exist = false);
          }
        }
      });
      await Promise.all(myPromise);
      if (!exist) {
        return res.status(404).send({
          message: "An ingredient in the choices list wasn't found",
          code: 404,
          success: false,
          date: Date.now(),
        });
      }
    }
    if (supplements && supplements[0]) {
      let exist = true;
      const myPromise = supplements.map(async (supplement) => {
        const foundSupplement = await IngredientModel.findOne({
          id: supplement,
          isSupplement: true,
          idCompany: foundCompany.id,
          isArchived: false,
        });
        if (!foundSupplement) {
          return (exist = false);
        }
      });
      await Promise.all(myPromise);
      if (!exist) {
        return res.status(404).send({
          message: "A supplement in the list wasn't found",
          code: 404,
          success: false,
          date: Date.now(),
        });
      }
    }
    let newProduct = new ProductModel({
      id: idProduct,
      idCompany: foundCompany.id,
      name,
      description,
      composable,
      category,
      visibility,
      foodCost,
      supplements,
      choices,
      price,
      promoPrice,
      image,
      restaurants,
      defaultIngredients,
      priority,
    });
    await newProduct.save();
    res.status(200).send({
      message: "Created Product",
      code: 200,
      success: true,
      date: Date.now(),
      data: newProduct,
    });

    const Promise1 = restaurants.map(async (idVendor) => {
      const foundVendor = await RestaurantModel.findOne({
        id: idVendor,
        idCompany: foundCompany.id,
        isArchived: false,
      });
      foundVendor.products.push(idProduct);
      await foundVendor.save();
    });
    await Promise.all(Promise1);
    if (defaultIngredients && defaultIngredients[0]) {
      const Promise2 = defaultIngredients.map(async (ingredient) => {
        const foundIngredient = await IngredientModel.findOne({
          id: ingredient.ingredient,
          isSupplement: false,
          idCompany: foundCompany.id,
          isArchived: false,
        });
        if (!foundIngredient.products.includes(idProduct)) {
          foundIngredient.products.push(idProduct);
          await foundIngredient.save();
        }
      });
      await Promise.all(Promise2);
    }
    if (choices && choices[0]) {
      const Promise3 = choices.map(async (choice) => {
        const insidePromise = choice.ingredients.map(async (ingredient) => {
          const foundIngredient = await IngredientModel.findOne({
            id: ingredient,
            isSupplement: false,
            idCompany: foundCompany.id,
            isArchived: false,
          });
          if (!foundIngredient.products.includes(idProduct)) {
            foundIngredient.products.push(idProduct);
            await foundIngredient.save();
          }
        });
        await Promise.all(insidePromise);
      });
      await Promise.all(Promise3);
    }
    if (supplements && supplements[0]) {
      const Promise4 = supplements.map(async (supplement) => {
        const foundSupplement = await IngredientModel.findOne({
          id: supplement,
          isSupplement: true,
          idCompany: foundCompany.id,
          isArchived: false,
        });
        foundSupplement.products.push(idProduct);
        await foundSupplement.save();
      });
      await Promise.all(Promise4);
    }
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from addProduct endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.getProducts = async (req, res) => {
  try {
    const token = req.headers["x-order-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);

    const foundUser = await UserModel.findOne({
      id: user.id,
    });
    const foundCompany = await CompanyModel.findOne({
      id: foundUser.idCompany,
    });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    if (!foundCompany || !foundCompany.users.includes(foundUser.id)) {
      return res.status(404).send({
        message: "You don't belong to a company",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }

    let foundProducts = await ProductModel.find({
      idCompany: foundCompany.id,
      isArchived: false,
    }).select("-__v -_id ");
    if (foundProducts && foundProducts[0]) {
      res.status(200).send({
        message: "Fetched products",
        code: 200,
        success: true,
        date: Date.now(),
        data: foundProducts,
      });
    } else {
      res.status(200).send({
        message: "No products",
        code: 200,
        success: true,
        date: Date.now(),
        data: [],
      });
    }
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from getProducts endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.archiveProduct = async (req, res) => {
  try {
    const token = req.headers["x-order-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);

    const foundUser = await UserModel.findOne({
      id: user.id,
    });
    const foundCompany = await CompanyModel.findOne({
      id: foundUser.idCompany,
    });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    if (!foundCompany || !foundCompany.users.includes(foundUser.id)) {
      return res.status(404).send({
        message: "You don't belong to a company",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const { id } = req.params;
    const foundProduct = await ProductModel.findOneAndUpdate(
      {
        id,
        idCompany: foundCompany.id,
        isArchived: false,
      },
      { isArchived: true }
    );
    if (!foundProduct) {
      return res.status(404).send({
        message: "Product not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    res.status(200).send({
      message: "Archived product",
      code: 200,
      success: true,
      date: Date.now(),
    });
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from archiveProduct endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.getProduct = async (req, res) => {
  try {
    const token = req.headers["x-order-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);

    const foundUser = await UserModel.findOne({
      id: user.id,
    });
    const foundCompany = await CompanyModel.findOne({
      id: foundUser.idCompany,
    });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    if (!foundCompany || !foundCompany.users.includes(foundUser.id)) {
      return res.status(404).send({
        message: "You don't belong to a company",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const { id } = req.params;
    let foundProduct = await ProductModel.findOne({
      id,
      idCompany: foundCompany.id,
      isArchived: false,
    }).select("-_id -__v");
    if (!foundProduct) {
      return res.status(404).send({
        message: "Product not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }

    let foundCategory = await CategoryModel.findOne({
      id: foundProduct.category,
      idCompany: foundCompany.id,
      isArchived: false,
    }).select("-_id -__v");
    if (!foundCategory) {
      return res.status(404).send({
        message: "Category not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    let vendorNameTab = [];
    const myPromise = foundProduct.restaurants.map(async (idVendor) => {
      const foundVendor = await RestaurantModel.findOne({
        id: idVendor,
        idCompany: foundCompany.id,
        isArchived: false,
      });
      if (foundVendor && foundCompany.restaurants.includes(foundVendor.id)) {
        vendorNameTab.push(foundVendor.name);
      }
    });
    await Promise.all(myPromise);
    foundProduct.restaurants = vendorNameTab;
    foundProduct.category = foundCategory.name;
    res.status(200).send({
      message: "Fetched product",
      code: 200,
      success: true,
      date: Date.now(),
      data: foundProduct,
    });
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from getProduct endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.editProduct = async (req, res) => {
  try {
    const token = req.headers["x-order-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);

    const foundUser = await UserModel.findOne({
      id: user.id,
    });
    const foundCompany = await CompanyModel.findOne({
      id: foundUser.idCompany,
    });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    if (!foundCompany || !foundCompany.users.includes(foundUser.id)) {
      return res.status(404).send({
        message: "You don't belong to a company",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const { id } = req.params;
    let values = req.body;
    const foundProduct = await ProductModel.findOne({
      id,
      isArchived: false,
      idCompany: foundCompany.id,
    });
    if (!foundProduct) {
      return res.status(404).send({
        message: "Product not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    if (values.restaurants && values.restaurants[0]) {
      if (foundCompany.type === "monobrand" && values.restaurants.length > 1) {
        return res.status(401).send({
          message:
            "Your company is Monobrand, you can't assing to more than 1 restaurant",
          code: 401,
          success: false,
          date: Date.now(),
        });
      }

      let exist = true;
      const myPromise = values.restaurants.map(async (idVendor) => {
        const foundVendor = await RestaurantModel.findOne({
          id: idVendor,
          idCompany: foundCompany.id,
          isArchived: false,
        });
        if (
          !foundVendor ||
          !foundCompany.restaurants.includes(foundVendor.id)
        ) {
          return (exist = false);
        }
      });
      await Promise.all(myPromise);
      if (!exist) {
        return res.status(404).send({
          message:
            "A restaurant in the list wasn't found or doesn't belong to your company",
          code: 404,
          success: false,
          date: Date.now(),
        });
      }
    }
    if (values.category) {
      const foundCategory = await CategoryModel.findOne({
        id: values.category,
        isArchived: false,
        idCompany: foundCompany.id,
      });
      if (!foundCategory) {
        return res.status(404).send({
          message: "Category not found",
          code: 404,
          success: false,
          date: Date.now(),
        });
      }
    }
    if (values.supplements && values.supplements[0]) {
      let exist = true;
      const myPromise = values.supplements.map(async (supplement) => {
        const foundSupplement = await IngredientModel.findOne({
          id: supplement,
          isSupplement: true,
          idCompany: foundCompany.id,
          isArchived: false,
        });
        if (!foundSupplement) {
          return (exist = false);
        }
      });
      await Promise.all(myPromise);
      if (!exist) {
        return res.status(404).send({
          message:
            "A supplement in the list wasn't found or doesn't belong to your company",
          code: 404,
          success: false,
          date: Date.now(),
        });
      }
    }
    if (values.defaultIngredients && values.defaultIngredients[0]) {
      let exist = true;
      let foodCost = 0;
      const myPromise = values.defaultIngredients.map(async (ingredient) => {
        const foundIngredient = await IngredientModel.findOne({
          id: ingredient.ingredient,
          isSupplement: false,
          idCompany: foundCompany.id,
          isArchived: false,
        });
        if (!foundIngredient) {
          return (exist = false);
        }
        foodCost += foundIngredient.purchasedPrice * ingredient.quantity;
      });
      await Promise.all(myPromise);
      if (!exist) {
        return res.status(404).send({
          message:
            "An ingredient in the list wasn't found or doesn't belong to your company",
          code: 404,
          success: false,
          date: Date.now(),
        });
      }
      values.foodCost = foodCost;
    }
    if (values.choices && values.choices[0]) {
      let exist = true;
      const myPromise = values.choices.map(async (choice) => {
        for (let ingredient of choice.ingredients) {
          const foundIngredient = await IngredientModel.findOne({
            id: ingredient,
            isSupplement: false,
            idCompany: foundCompany.id,
            isArchived: false,
          });
          if (!foundIngredient) {
            return (exist = false);
          }
        }
      });
      await Promise.all(myPromise);
      if (!exist) {
        return res.status(404).send({
          message: "An ingredient in the choices list wasn't found",
          code: 404,
          success: false,
          date: Date.now(),
        });
      }
    }
    await foundProduct.updateOne(values);
    res.status(200).send({
      message: "Updated product",
      code: 200,
      success: true,
      date: Date.now(),
    });

    let Promise1, Promise2, Promise3, Promise4;
    if (values.restaurants && values.restaurants[0]) {
      Promise1 = values.restaurants.map(async (idVendor) => {
        const foundVendor = await RestaurantModel.findOne({
          id: idVendor,
          idCompany: foundCompany.id,
          isArchived: false,
        });
        if (!foundVendor.products.includes(id)) {
          foundVendor.products.push(id);
          await foundVendor.save();
        }
      });
    }
    if (values.defaultIngredients && values.defaultIngredients[0]) {
      Promise2 = values.defaultIngredients.map(async (ingredient) => {
        const foundIngredient = await IngredientModel.findOne({
          id: ingredient.ingredient,
          isSupplement: false,
          idCompany: foundCompany.id,
          isArchived: false,
        });

        if (!foundIngredient.products.includes(id)) {
          foundIngredient.products.push(id);
          await foundIngredient.save();
        }
        foodCost += foundIngredient.purchasedPrice * ingredient.quantity;
      });
    }
    if (values.choices && values.choices[0]) {
      Promise3 = values.choices.map(async (choice) => {
        for (let ingredient of choice.ingredients) {
          const foundIngredient = await IngredientModel.findOne({
            id: ingredient,
            isSupplement: false,
            idCompany: foundCompany.id,
            isArchived: false,
          });
          if (!foundIngredient.products.includes(idProduct)) {
            foundIngredient.products.push(idProduct);
            await foundIngredient.save();
          }
        }
      });
    }
    if (values.supplements && values.supplements[0]) {
      Promise4 = values.supplements.map(async (supplement) => {
        const foundSupplement = await IngredientModel.findOne({
          id: supplement,
          isSupplement: true,
          idCompany: foundCompany.id,
          isArchived: false,
        });

        if (!foundSupplement.products.includes(id)) {
          foundSupplement.products.push(id);
          await foundSupplement.save();
        }
      });
    }
    await Promise.all(Promise1, Promise2, Promise3, Promise4);
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from editProduct endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.restoreProduct = async (req, res) => {
  try {
    const token = req.headers["x-order-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);

    const foundUser = await UserModel.findOne({
      id: user.id,
    });
    const foundCompany = await CompanyModel.findOne({
      id: foundUser.idCompany,
    });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    if (!foundCompany || !foundCompany.users.includes(foundUser.id)) {
      return res.status(404).send({
        message: "You don't belong to a company",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const { id } = req.params;
    const foundProduct = await ProductModel.findOneAndUpdate(
      {
        id,
        idCompany: foundCompany.id,
        isArchived: true,
      },
      { isArchived: false }
    );
    if (!foundProduct) {
      return res.status(404).send({
        message: "Product not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    res.status(200).send({
      message: "Restored product",
      code: 200,
      success: true,
      date: Date.now(),
    });
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from restoreProduct endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.getProductIngredients = async (req, res) => {
  try {
    const token = req.headers["x-order-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);

    const foundUser = await UserModel.findOne({
      id: user.id,
    });
    const foundCompany = await CompanyModel.findOne({
      id: foundUser.idCompany,
    });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    if (!foundCompany || !foundCompany.users.includes(foundUser.id)) {
      return res.status(404).send({
        message: "You don't belong to a company",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const { id } = req.params;
    const foundProduct = await ProductModel.findOne({
      id,
      isArchived: false,
      idCompany: foundCompany.id,
    });
    if (!foundProduct) {
      return res.status(404).send({
        message: "Product not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    let foundIngredients = [];
    const myPromise = foundProduct.defaultIngredients.map(
      async (ingredient) => {
        const foundIngredient = await IngredientModel.findOne({
          id: ingredient.ingredient,
          isSupplement: false,
          isArchived: false,
          idCompany: foundCompany.id,
        }).select("-__v -_id");
        if (foundIngredient) {
          foundIngredients.push({
            ingredient: foundIngredient.name,
            quantity: ingredient.quantity,
            price: foundIngredient.purchasedPrice,
          });
        }
      }
    );
    await Promise.all(myPromise);
    res.status(200).send({
      message: "Fetched product ingredients",
      code: 200,
      success: true,
      date: Date.now(),
      data: foundIngredients,
    });
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from getProductIngredients endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.getProductSupplements = async (req, res) => {
  try {
    const token = req.headers["x-order-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);

    const foundUser = await UserModel.findOne({
      id: user.id,
    });
    const foundCompany = await CompanyModel.findOne({
      id: foundUser.idCompany,
    });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    if (!foundCompany || !foundCompany.users.includes(foundUser.id)) {
      return res.status(404).send({
        message: "You don't belong to a company",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const { id } = req.params;
    const foundProduct = await ProductModel.findOne({
      id,
      isArchived: false,
      idCompany: foundCompany.id,
    });
    if (!foundProduct) {
      return res.status(404).send({
        message: "Product not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }

    const foundSupplements = await IngredientModel.find({
      id: { $in: foundProduct.supplements },
      isArchived: false,
      isSupplement: true,
      idCompany: foundCompany.id,
    });

    res.status(200).send({
      message: "Fetched product supplements",
      code: 200,
      success: true,
      date: Date.now(),
      data: foundSupplements,
    });
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from getProductSupplements endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.addCategory = async (req, res) => {
  try {
    const token = req.headers["x-order-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);

    const foundUser = await UserModel.findOne({
      id: user.id,
    });
    const foundCompany = await CompanyModel.findOne({
      id: foundUser.idCompany,
    });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    if (!foundCompany || !foundCompany.users.includes(foundUser.id)) {
      return res.status(404).send({
        message: "You don't belong to a company",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }

    let { name, restaurants, image, priority } = req.body;
    if (!name || !restaurants || !priority || restaurants.length === 0) {
      return res.status(400).send({
        message: "Missing details",
        code: 400,
        success: false,
        date: Date.now(),
      });
    }
    const idCategory = uuidv4();

    if (foundCompany.type === "monobrand" && restaurants.length > 1) {
      return res.status(401).send({
        message:
          "Your company is Monobrand, you can't assing to more than 1 restaurant",
        code: 401,
        success: false,
        date: Date.now(),
      });
    }

    let exist = true;
    const myPromise = restaurants.map(async (idVendor) => {
      const foundVendor = await RestaurantModel.findOne({
        id: idVendor,
        idCompany: foundCompany.id,
        isArchived: false,
      });
      if (!foundVendor || !foundCompany.restaurants.includes(foundVendor.id)) {
        return (exist = false);
      }

      foundVendor.categories.push(idCategory);
      await foundVendor.save();
    });
    await Promise.all(myPromise);
    if (!exist) {
      return res.status(404).send({
        message:
          "A restaurant in the list wasn't found or doesn't belong to your company",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }

    let newCategory = new CategoryModel({
      id: idCategory,
      idCompany: foundCompany.id,
      restaurants,
      image,
      priority,
      name,
    });
    await newCategory.save();
    res.status(200).send({
      message: "Created category",
      code: 200,
      success: true,
      date: Date.now(),
      data: newCategory,
    });
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from addCategory endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.getCategories = async (req, res) => {
  try {
    const token = req.headers["x-order-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);

    const foundUser = await UserModel.findOne({
      id: user.id,
    });
    const foundCompany = await CompanyModel.findOne({
      id: foundUser.idCompany,
    });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    if (!foundCompany || !foundCompany.users.includes(foundUser.id)) {
      return res.status(404).send({
        message: "You don't belong to a company",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }

    const foundCategories = await CategoryModel.find({
      idCompany: foundCompany.id,
      isArchived: false,
    }).select("-__v -_id ");
    if (foundCategories && foundCategories[0]) {
      res.status(200).send({
        message: "Fetched categories",
        code: 200,
        success: true,
        date: Date.now(),
        data: foundCategories,
      });
    } else {
      res.status(200).send({
        message: "No categories",
        code: 200,
        success: true,
        date: Date.now(),
        data: [],
      });
    }
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from getCategories endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.archiveCategory = async (req, res) => {
  try {
    const token = req.headers["x-order-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);

    const foundUser = await UserModel.findOne({
      id: user.id,
    });
    const foundCompany = await CompanyModel.findOne({
      id: foundUser.idCompany,
    });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    if (!foundCompany || !foundCompany.users.includes(foundUser.id)) {
      return res.status(404).send({
        message: "You don't belong to a company",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const { id } = req.params;
    const foundCategory = await CategoryModel.findOneAndUpdate(
      {
        id,
        idCompany: foundCompany.id,
        isArchived: false,
      },
      { isArchived: true }
    );
    if (!foundCategory) {
      return res.status(404).send({
        message: "Category not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    res.status(200).send({
      message: "Archived category",
      code: 200,
      success: true,
      date: Date.now(),
    });
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from archiveCategory endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.editCategory = async (req, res) => {
  try {
    const token = req.headers["x-order-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);

    const foundUser = await UserModel.findOne({
      id: user.id,
    });
    const foundCompany = await CompanyModel.findOne({
      id: foundUser.idCompany,
    });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    if (!foundCompany || !foundCompany.users.includes(foundUser.id)) {
      return res.status(404).send({
        message: "You don't belong to a company",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const { id } = req.params;
    const foundCategory = await CategoryModel.findOne({
      id,
      isArchived: false,
      idCompany: foundCompany.id,
    });
    if (!foundCategory) {
      return res.status(404).send({
        message: "Category not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }

    const values = req.body;
    if (values.restaurants && values.restaurants[0]) {
      if (foundCompany.type === "monobrand" && values.restaurants.length > 1) {
        return res.status(401).send({
          message:
            "Your company is Monobrand, you can't assing to more than 1 restaurant",
          code: 401,
          success: false,
          date: Date.now(),
        });
      }

      let exist = true;
      const myPromise = values.restaurants.map(async (idVendor) => {
        const foundVendor = await RestaurantModel.findOne({
          id: idVendor,
          idCompany: foundCompany.id,
          isArchived: false,
        });
        if (
          !foundVendor ||
          !foundCompany.restaurants.includes(foundVendor.id)
        ) {
          return (exist = false);
        }
        if (!foundVendor.categories.includes(id)) {
          foundVendor.categories.push(id);
          await foundVendor.save();
        }
      });
      await Promise.all(myPromise);
      if (!exist) {
        return res.status(404).send({
          message:
            "A restaurant in the list wasn't found or doesn't belong to your company",
          code: 404,
          success: false,
          date: Date.now(),
        });
      }
    }
    await foundCategory.updateOne(values);
    res.status(200).send({
      message: "Updated category",
      code: 200,
      success: true,
      date: Date.now(),
    });
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from editCategory endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.restoreCategory = async (req, res) => {
  try {
    const token = req.headers["x-order-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);

    const foundUser = await UserModel.findOne({
      id: user.id,
    });
    const foundCompany = await CompanyModel.findOne({
      id: foundUser.idCompany,
    });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    if (!foundCompany || !foundCompany.users.includes(foundUser.id)) {
      return res.status(404).send({
        message: "You don't belong to a company",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const { id } = req.params;
    const foundCategory = await CategoryModel.findOneAndUpdate(
      {
        id,
        idCompany: foundCompany.id,
        isArchived: true,
      },
      { isArchived: false }
    );
    if (!foundCategory) {
      return res.status(404).send({
        message: "Category not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    res.status(200).send({
      message: "Restored category",
      code: 200,
      success: true,
      date: Date.now(),
    });
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from restoreCategory endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.addTable = async (req, res) => {
  try {
    const token = req.headers["x-order-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);

    const foundUser = await UserModel.findOne({
      id: user.id,
    });
    const foundCompany = await CompanyModel.findOne({
      id: foundUser.idCompany,
    });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    if (!foundCompany || !foundCompany.users.includes(foundUser.id)) {
      return res.status(404).send({
        message: "You don't belong to a company",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const { tableNumber, waiter, restaurant } = req.body;
    if (!tableNumber || !waiter || !restaurant) {
      return res.status(400).send({
        message: "Missing details",
        code: 400,
        success: false,
        date: Date.now(),
      });
    }
    const foundWaiter = await UserModel.findOne({
      role: "waiter",
      id: waiter,
      idCompany: foundCompany.id,
      isArchived: false,
    });
    if (!foundWaiter) {
      return res.status(404).send({
        message: "Waiter not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const foundRestaurant = await RestaurantModel.findOne({
      id: restaurant,
      idCompany: foundCompany.id,
      isArchived: false,
    });
    if (
      !foundRestaurant ||
      !foundCompany.restaurants.includes(foundRestaurant.id)
    ) {
      return res.status(404).send({
        message: "Restaurant not found or doesn't belong to your company",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const idTable = uuidv4();
    let newTable = new TableModel({
      idCompany: foundCompany.id,
      restaurant,
      id: idTable,
      tableNumber,
      waiter,
    });
    foundRestaurant.tables.push(idTable);
    await foundRestaurant.save();
    await newTable.save();
    return res.status(200).send({
      message: "Created new table",
      code: 200,
      success: true,
      date: Date.now(),
      data: newTable,
    });
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from addTable endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.getTables = async (req, res) => {
  try {
    const token = req.headers["x-order-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);

    const foundUser = await UserModel.findOne({
      id: user.id,
    });
    const foundCompany = await CompanyModel.findOne({
      id: foundUser.idCompany,
    });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    if (!foundCompany || !foundCompany.users.includes(foundUser.id)) {
      return res.status(404).send({
        message: "You don't belong to a company",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const foundTables = await TableModel.find({
      idCompany: foundCompany.id,
      isArchived: false,
    }).select("-_id -__v");
    return res.status(200).send({
      message: "Fetched tables",
      code: 200,
      success: true,
      date: Date.now(),
      data: foundTables,
    });
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from getTables endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.getTable = async (req, res) => {
  try {
    const token = req.headers["x-order-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);

    const foundUser = await UserModel.findOne({
      id: user.id,
    });
    const foundCompany = await CompanyModel.findOne({
      id: foundUser.idCompany,
    });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    if (!foundCompany || !foundCompany.users.includes(foundUser.id)) {
      return res.status(404).send({
        message: "You don't belong to a company",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const { id } = req.params;
    const foundTable = await TableModel.findOne({
      id,
      idCompany: foundCompany.id,
      isArchived: false,
    }).select("-_id -__v");
    return res.status(200).send({
      message: "Fetched table",
      code: 200,
      success: true,
      date: Date.now(),
      data: foundTable,
    });
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from getTable endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.editTable = async (req, res) => {
  try {
    const token = req.headers["x-order-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);

    const foundUser = await UserModel.findOne({
      id: user.id,
    });
    const foundCompany = await CompanyModel.findOne({
      id: foundUser.idCompany,
    });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    if (!foundCompany || !foundCompany.users.includes(foundUser.id)) {
      return res.status(404).send({
        message: "You don't belong to a company",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const { id } = req.params;
    const values = req.body;
    if (values.waiter) {
      const foundWaiter = await UserModel.findOne({
        role: "waiter",
        id: values.waiter,
        idCompany: foundCompany.id,
        isArchived: false,
      });
      if (!foundWaiter) {
        return res.status(404).send({
          message: "Waiter not found",
          code: 404,
          success: false,
          date: Date.now(),
        });
      }
    }
    const foundTable = await TableModel.findOneAndUpdate(
      {
        id,
        idCompany: foundCompany.id,
        isArchived: false,
      },
      { $set: values },
      { new: true }
    );
    if (!foundTable)
      return res.status(404).send({
        message: "Table not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    return res.status(200).send({
      message: "Updated table",
      code: 200,
      success: true,
      date: Date.now(),
    });
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from editTable endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.updateTableStatus = async (req, res) => {
  try {
    const token = req.headers["x-order-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);

    const foundUser = await UserModel.findOne({
      id: user.id,
    });
    const foundCompany = await CompanyModel.findOne({
      id: foundUser.idCompany,
    });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    if (!foundCompany || !foundCompany.users.includes(foundUser.id)) {
      return res.status(404).send({
        message: "You don't belong to a company",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const { action, id } = req.params;
    if (action === "available") {
      const foundTable = await TableModel.findOneAndUpdate(
        {
          id,
          idCompany: foundCompany.id,
          isArchived: false,
          isAvailable: false,
        },
        {
          isAvailable: true,
        }
      );
      if (!foundTable)
        return res.status(404).send({
          message: "Table not found",
          code: 404,
          success: false,
          date: Date.now(),
        });
      return res.status(200).send({
        message: "Updated table",
        code: 200,
        success: true,
        date: Date.now(),
      });
    } else if (action === "busy") {
      const foundTable = await TableModel.findOneAndUpdate(
        {
          id,
          idCompany: foundCompany.id,
          isArchived: false,
          isAvailable: true,
        },
        {
          isAvailable: false,
        }
      );
      if (!foundTable)
        return res.status(404).send({
          message: "Table not found",
          code: 404,
          success: false,
          date: Date.now(),
        });
      return res.status(200).send({
        message: "Updated table",
        code: 200,
        success: true,
        date: Date.now(),
      });
    } else {
      res.status(406).send({
        message: "Invalid action type",
        code: 406,
        success: false,
        date: Date.now(),
      });
    }
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from updateTableStatus endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.archiveTable = async (req, res) => {
  try {
    const token = req.headers["x-order-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);

    const foundUser = await UserModel.findOne({
      id: user.id,
    });
    const foundCompany = await CompanyModel.findOne({
      id: foundUser.idCompany,
    });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    if (!foundCompany || !foundCompany.users.includes(foundUser.id)) {
      return res.status(404).send({
        message: "You don't belong to a company",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const { id } = req.params;

    const foundTable = await TableModel.findOneAndUpdate(
      {
        id,
        idCompany: foundCompany.id,
        isArchived: false,
      },
      { isArchived: true }
    );
    if (!foundTable)
      return res.status(404).send({
        message: "Table not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    return res.status(200).send({
      message: "Archived table",
      code: 200,
      success: true,
      date: Date.now(),
    });
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from archiveTable endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.restoreTable = async (req, res) => {
  try {
    const token = req.headers["x-order-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);

    const foundUser = await UserModel.findOne({
      id: user.id,
    });
    const foundCompany = await CompanyModel.findOne({
      id: foundUser.idCompany,
    });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    if (!foundCompany || !foundCompany.users.includes(foundUser.id)) {
      return res.status(404).send({
        message: "You don't belong to a company",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const { id } = req.params;

    const foundTable = await TableModel.findOneAndUpdate(
      {
        id,
        idCompany: foundCompany.id,
        isArchived: true,
      },
      { isArchived: false }
    );
    if (!foundTable)
      return res.status(404).send({
        message: "Table not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    return res.status(200).send({
      message: "Restored table",
      code: 200,
      success: true,
      date: Date.now(),
    });
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from restoreTable endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.addWaiter = async (req, res) => {
  try {
    const token = req.headers["x-order-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);

    const foundUser = await UserModel.findOne({
      id: user.id,
    });
    const foundCompany = await CompanyModel.findOne({
      id: foundUser.idCompany,
    });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    if (!foundCompany || !foundCompany.users.includes(foundUser.id)) {
      return res.status(404).send({
        message: "You don't belong to a company",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const {
      email,
      cin,
      birthDate,
      password,
      phone,
      name,
      surname,
      restaurant,
    } = req.body;

    if (
      !email ||
      !cin ||
      !password ||
      !name ||
      !surname ||
      !restaurant ||
      restaurant.length === 0
    ) {
      return res.status(404).send({
        message: "Missing informations.",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const foundRestaurant = await RestaurantModel.findOne({
      id: restaurant,
      idCompany: foundCompany.id,
      isArchived: false,
    });

    if (
      !foundRestaurant ||
      !foundCompany.restaurants.includes(foundRestaurant.id)
    ) {
      return res.status(406).send({
        message: "Resturant not found or doesn't belong to your company",
        code: 406,
        success: false,
        date: Date.now(),
      });
    }

    const foundEmail = await UserModel.findOne({
      email,
      isArchived: false,
    });

    if (foundEmail) {
      return res.status(401).send({
        message: "User with the same email already exists",
        code: 401,
        success: false,
        date: Date.now(),
      });
    }

    const foundCin = await UserModel.findOne({
      cin,
      isArchived: false,
    });

    if (foundCin) {
      return res.status(401).send({
        message: "User with the same cin already exists",
        code: 401,
        success: false,
        date: Date.now(),
      });
    }
    const idWaiter = uuidv4();
    let newUser = new UserModel({
      idCompany: foundCompany.id,
      id: idWaiter,
      email,
      cin,
      birthDate,
      password: await bcrypt.hash(password, 10),
      phone,
      name,
      surname,
      restaurant,
      role: "waiter",
    });
    await newUser.save();
    foundCompany.users.push(idWaiter);
    await foundCompany.save();
    foundRestaurant.waiters.push(idWaiter);
    await foundRestaurant.save();
    return res.status(200).send({
      message: "Created new waiter",
      code: 200,
      success: true,
      date: Date.now(),
      data: newUser,
    });
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from addWaiter endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.getWaiters = async (req, res) => {
  try {
    const token = req.headers["x-order-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);

    const foundUser = await UserModel.findOne({
      id: user.id,
    });
    const foundCompany = await CompanyModel.findOne({
      id: foundUser.idCompany,
    });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    if (!foundCompany || !foundCompany.users.includes(foundUser.id)) {
      return res.status(404).send({
        message: "You don't belong to a company",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const foundWaiters = await UserModel.find({
      idCompany: foundCompany.id,
      role: "waiter",
      isArchived: false,
    }).select(
      "id name surname email cin birthDate role isActive phone photo createdAt idCompany"
    );
    return res.status(200).send({
      message: "Fetched waiters",
      code: 200,
      success: true,
      date: Date.now(),
      data: foundWaiters,
    });
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from getWaiters endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.getWaiter = async (req, res) => {
  try {
    const token = req.headers["x-order-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);

    const foundUser = await UserModel.findOne({
      id: user.id,
    });
    const foundCompany = await CompanyModel.findOne({
      id: foundUser.idCompany,
    });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    if (!foundCompany || !foundCompany.users.includes(foundUser.id)) {
      return res.status(404).send({
        message: "You don't belong to a company",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const { id } = req.params;
    const foundWaiter = await UserModel.findOne({
      id,
      rold: "waiter",
      idCompany: foundCompany.id,
      isArchived: false,
    }).select(
      "id name surname email cin birthDate role isActive phone photo createdAt idCompany"
    );
    if (foundWaiter)
      return res.status(200).send({
        message: "Fetched waiter",
        code: 200,
        success: true,
        date: Date.now(),
        data: foundWaiter,
      });

    return res.status(404).send({
      message: "Waiter not found",
      code: 404,
      success: true,
      date: Date.now(),
    });
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from getWaiter endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.editWaiter = async (req, res) => {
  try {
    const token = req.headers["x-order-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);

    const foundUser = await UserModel.findOne({
      id: user.id,
    });
    const foundCompany = await CompanyModel.findOne({
      id: foundUser.idCompany,
    });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    if (!foundCompany || !foundCompany.users.includes(foundUser.id)) {
      return res.status(404).send({
        message: "You don't belong to a company",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const { id } = req.params;
    const values = req.body;

    const foundWaiter = await UserModel.findOneAndUpdate(
      {
        id,
        role: "waiter",
        idCompany: foundCompany.id,
        isArchived: false,
      },
      { $set: values },
      { new: true }
    );
    if (!foundWaiter)
      return res.status(404).send({
        message: "Waiter not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    return res.status(200).send({
      message: "Updated waiter",
      code: 200,
      success: true,
      date: Date.now(),
    });
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from editWaiter endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.archiveWaiter = async (req, res) => {
  try {
    const token = req.headers["x-order-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);

    const foundUser = await UserModel.findOne({
      id: user.id,
    });
    const foundCompany = await CompanyModel.findOne({
      id: foundUser.idCompany,
    });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    if (!foundCompany || !foundCompany.users.includes(foundUser.id)) {
      return res.status(404).send({
        message: "You don't belong to a company",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const { id } = req.params;

    const foundWaiter = await UserModel.findOneAndUpdate(
      {
        id,
        role: "waiter",
        idCompany: foundCompany.id,
        isArchived: false,
      },
      { isArchived: true }
    );
    if (!foundWaiter)
      return res.status(404).send({
        message: "Waiter not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    return res.status(200).send({
      message: "Archived waiter",
      code: 200,
      success: true,
      date: Date.now(),
    });
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from archiveWaiter endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.restoreWaiter = async (req, res) => {
  try {
    const token = req.headers["x-order-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);

    const foundUser = await UserModel.findOne({
      id: user.id,
    });
    const foundCompany = await CompanyModel.findOne({
      id: foundUser.idCompany,
    });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    if (!foundCompany || !foundCompany.users.includes(foundUser.id)) {
      return res.status(404).send({
        message: "You don't belong to a company",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const { id } = req.params;

    const foundWaiter = await UserModel.findOneAndUpdate(
      {
        id,
        role: "waiter",
        idCompany: foundCompany.id,
        isArchived: true,
      },
      { isArchived: false }
    );
    if (!foundWaiter)
      return res.status(404).send({
        message: "Waiter not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    return res.status(200).send({
      message: "Restored waiter",
      code: 200,
      success: true,
      date: Date.now(),
    });
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from restoreWaiter endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.createCoupon = async (req, res) => {
  try {
    const token = req.headers["x-order-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);

    const foundUser = await UserModel.findOne({
      id: user.id,
    });
    const foundCompany = await CompanyModel.findOne({
      id: foundUser.idCompany,
    });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    if (!foundCompany || !foundCompany.users.includes(foundUser.id)) {
      return res.status(404).send({
        message: "You don't belong to a company",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }

    let code = "";
    let isFound = false;
    do {
      code = await generateRandomCode();
      const foundCode = await CouponModel.findOne({
        code,
        isArchived: false,
        idCompany: foundCompany.id,
      });
      if (foundCode) {
        isFound = true;
      }
    } while (isFound);
    const {
      amount,
      restaurant,
      percentage,
      multiUse,
      quantity,
      startDate,
      endDate,
    } = req.body;
    if (!amount || !restaurant) {
      return res.status(400).send({
        message: "Missing details",
        code: 400,
        success: false,
        date: Date.now(),
      });
    }
    const foundRestaurant = await RestaurantModel.findOne({
      id: restaurant,
      isArchived: false,
      idCompany: foundCompany.id,
    });
    if (
      !foundRestaurant ||
      !foundCompany.restaurants.includes(foundRestaurant.id)
    )
      return res.status(404).send({
        message: "Restaurant not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    const idCoupon = uuidv4();
    let newCoupon = new CouponModel({
      id: idCoupon,
      idCompany: foundCompany.id,
      code,
      amount,
      restaurant,
      percentage,
      multiUse,
      quantity,
      startDate,
      endDate,
    });
    foundRestaurant.coupons.push(idCoupon);
    await foundRestaurant.save();
    await newCoupon.save();

    return res.status(200).send({
      message: "Created new coupon",
      code: 200,
      success: true,
      date: Date.now(),
      data: newCoupon,
    });
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from createCoupon endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.getCoupons = async (req, res) => {
  try {
    const token = req.headers["x-order-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);

    const foundUser = await UserModel.findOne({
      id: user.id,
    });
    const foundCompany = await CompanyModel.findOne({
      id: foundUser.idCompany,
    });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    if (!foundCompany || !foundCompany.users.includes(foundUser.id)) {
      return res.status(404).send({
        message: "You don't belong to a company",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const foundCoupons = await CouponModel.find({
      idCompany: foundCompany.id,
      isArchived: false,
    }).select("-_id -__v");
    return res.status(200).send({
      message: "Fetched coupons",
      code: 200,
      success: true,
      date: Date.now(),
      data: foundCoupons,
    });
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from getCoupons endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.getCoupon = async (req, res) => {
  try {
    const token = req.headers["x-order-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);

    const foundUser = await UserModel.findOne({
      id: user.id,
    });
    const foundCompany = await CompanyModel.findOne({
      id: foundUser.idCompany,
    });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    if (!foundCompany || !foundCompany.users.includes(foundUser.id)) {
      return res.status(404).send({
        message: "You don't belong to a company",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const { id } = req.params;
    const foundCoupon = await CouponModel.findOne({
      id,
      idCompany: foundCompany.id,
      isArchived: false,
    }).select("-_id -__v");
    if (foundCoupon)
      return res.status(200).send({
        message: "Fetched coupon",
        code: 200,
        success: true,
        date: Date.now(),
        data: foundCoupon,
      });

    return res.status(404).send({
      message: "Coupon not found",
      code: 404,
      success: true,
      date: Date.now(),
    });
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from getCoupon endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.editCoupon = async (req, res) => {
  try {
    const token = req.headers["x-order-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);

    const foundUser = await UserModel.findOne({
      id: user.id,
    });
    const foundCompany = await CompanyModel.findOne({
      id: foundUser.idCompany,
    });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    if (!foundCompany || !foundCompany.users.includes(foundUser.id)) {
      return res.status(404).send({
        message: "You don't belong to a company",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const { id } = req.params;

    const values = req.body;
    if (values.code)
      return res.status(401).send({
        message: "You cannot modify this field",
        code: 401,
        success: false,
        date: Date.now(),
      });
    const foundCoupon = await CouponModel.findOneAndUpdate(
      {
        id,
        idCompany: foundCompany.id,
        isArchived: false,
      },
      { $set: values },
      { new: true }
    );
    if (!foundCoupon)
      return res.status(404).send({
        message: "Coupon not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    return res.status(200).send({
      message: "Updated coupon",
      code: 200,
      success: true,
      date: Date.now(),
    });
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from editCoupon endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.archiveCoupon = async (req, res) => {
  try {
    const token = req.headers["x-order-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);

    const foundUser = await UserModel.findOne({
      id: user.id,
    });
    const foundCompany = await CompanyModel.findOne({
      id: foundUser.idCompany,
    });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    if (!foundCompany || !foundCompany.users.includes(foundUser.id)) {
      return res.status(404).send({
        message: "You don't belong to a company",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const { id } = req.params;

    const foundCoupon = await CouponModel.findOneAndUpdate(
      {
        id,
        idCompany: foundCompany.id,
        isArchived: false,
      },
      { isArchived: true }
    );
    if (!foundCoupon)
      return res.status(404).send({
        message: "Coupon not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    return res.status(200).send({
      message: "Archived coupon",
      code: 200,
      success: true,
      date: Date.now(),
    });
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from archiveCoupon endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.restoreCoupon = async (req, res) => {
  try {
    const token = req.headers["x-order-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);

    const foundUser = await UserModel.findOne({
      id: user.id,
    });
    const foundCompany = await CompanyModel.findOne({
      id: foundUser.idCompany,
    });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    if (!foundCompany || !foundCompany.users.includes(foundUser.id)) {
      return res.status(404).send({
        message: "You don't belong to a company",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const { id } = req.params;

    const foundCoupon = await CouponModel.findOneAndUpdate(
      {
        id,
        idCompany: foundCompany.id,
        isArchived: true,
      },
      { isArchived: false }
    );
    if (!foundCoupon)
      return res.status(404).send({
        message: "Coupon not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    return res.status(200).send({
      message: "Restored coupon",
      code: 200,
      success: true,
      date: Date.now(),
    });
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from restoreCoupon endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.createOrder = async (req, res) => {
  try {
    const token = req.headers["x-order-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);

    const foundUser = await UserModel.findOne({
      id: user.id,
    });
    const foundCompany = await CompanyModel.findOne({
      id: foundUser.idCompany,
    });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    if (!foundCompany || !foundCompany.users.includes(foundUser.id)) {
      return res.status(404).send({
        message: "You don't belong to a company",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const { table, isPickup, usedCoupon, waiter, products, restaurant } =
      req.body;

    if (!table || !waiter || !products || !restaurant) {
      return res.status(400).send({
        message: "Missing details",
        code: 400,
        success: false,
        date: Date.now(),
      });
    }

    const foundRestaurant = await RestaurantModel.findOne({
      id: restaurant,
      isArchived: false,
      idCompany: foundCompany.id,
    });
    if (
      !foundRestaurant ||
      !foundCompany.restaurants.includes(foundRestaurant.id)
    ) {
      return res.status(404).send({
        message: "Restaurant not found or doesn't belong to your company",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    let foundTable;
    if (isPickup) {
      foundTable = await TableModel.findOne({
        id: table,
        restaurant,
        isArchived: false,
        idCompany: foundCompany.id,
      });
    } else {
      foundTable = await TableModel.findOne({
        id: table,
        restaurant,
        isAvailable: true,
        isArchived: false,
        idCompany: foundCompany.id,
      });
    }

    if (!foundTable) {
      return res.status(404).send({
        message: "Table not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const foundWaiter = await UserModel.findOne({
      id: waiter,
      role: "waiter",
      isArchived: false,
      idCompany: foundCompany.id,
    });
    if (!foundWaiter) {
      return res.status(404).send({
        message: "Waiter not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const idOrder = uuidv4();
    let newOrder = new OrderModel({
      id: idOrder,
      idCompany: foundCompany,
      restaurant: foundRestaurant.id,
      waiter: foundWaiter.id,
      table: foundTable.id,
      platform: "onPlace",
      status: "Pending",
      products,
    });
    let productsTotal = 0;
    for (let product of products) {
      const foundProduct = await ProductModel.findOne({
        id: product.productID,
        idCompany: foundCompany.id,
        isArchived: false,
      });
      if (
        !foundProduct ||
        !foundProduct.restaurants.includes(foundRestaurant.id)
      ) {
        return res.status(404).send({
          message: "Product not found or doesn't belong to this vendor",
          code: 404,
          success: false,
          date: Date.now(),
        });
      }
      productsTotal += foundProduct.price * product.quantity;
      if (product.choices && product.choices[0]) {
        for (let ingredient in product.choices) {
          const foundIngredient = await IngredientModel.findOne({
            id: ingredient,
            isSupplement: false,
            idCompany: foundCompany.id,
            isArchived: false,
          });
          if (!foundIngredient) {
            return res.status(404).send({
              message: "Product not found or doesn't belong to this vendor",
              code: 404,
              success: false,
              date: Date.now(),
            });
          }
        }
      }
      if (product.extra && product.extra[0]) {
        const extras = await IngredientModel.find({
          id: { $in: product.extra },
          isSupplement: true,
          idCompany: foundCompany.id,
          isArchived: false,
        });
        if (extras && extras[0]) {
          for (let extra in extras) {
            productsTotal += extra.price;
          }
        }
      }
    }
    newOrder.productsTotalPrice = productsTotal;
    if (usedCoupon !== "") {
      const foundCoupon = await CouponModel.findOne({
        code: usedCoupon,
        restaurant,
        idCompany: foundCompany.id,
        isArchived: false,
      });
      if (!foundCoupon || !foundRestaurant.coupons.includes(foundCoupon.id)) {
        return res.status(404).send({
          message: "Coupon not found",
          code: 404,
          success: false,
          date: Date.now(),
        });
      } else if (foundCoupon.multiUse) {
        if (!foundCoupon.isActive) {
          return res.status(406).send({
            message: "Coupon is not active",
            code: 406,
            success: false,
            date: Date.now(),
          });
        } else if (foundCoupon.quantity === 0) {
          return res.status(406).send({
            message: "Coupon ran out",
            code: 406,
            success: false,
            date: Date.now(),
          });
        } else {
          foundCoupon.quantity -= 1;
        }
      } else if (isUsed) {
        return res.status(406).send({
          message: "Coupon already used",
          code: 406,
          success: false,
          date: Date.now(),
        });
      } else {
        foundCoupon.isUsed = true;
      }
      let discountedAmount;
      if (foundCoupon.percentage) {
        discountedAmount = productsTotal * (foundCoupon.amount / 100);
        newOrder.productsTotalPrice = productsTotal - discountedAmount;
        newOrder.discountedAmount = discountedAmount;
      } else {
        discountedAmount = foundCoupon.amount;
        newOrder.productsTotalPrice = productsTotal - discountedAmount;
        newOrder.discountedAmount = discountedAmount;
      }
      await foundCoupon.save();
    }
    newOrder.totalPrice +=
      newOrder.productsTotalPrice +
      (newOrder.productsTotalPrice * newOrder.tva) / 100;
    if (newOrder.deliveryFee > 0) {
      newOrder.totalPrice += newOrder.deliveryFee;
    }
    if (!isPickup) {
      foundTable.isAvailable = false;
      foundTable.order = idOrder;
      foundTable.save();
    }
    foundRestaurant.orders.push(idOrder);
    await foundRestaurant.save();
    await newOrder.save();
    return res.status(200).send({
      message: "Created order",
      code: 200,
      success: true,
      date: Date.now(),
      data: newOrder,
    });
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from createOrder endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.getOrderDetails = async (req, res) => {
  try {
    const token = req.headers["x-order-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);

    const foundUser = await UserModel.findOne({
      id: user.id,
    });
    const foundCompany = await CompanyModel.findOne({
      id: foundUser.idCompany,
    });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    if (!foundCompany || !foundCompany.users.includes(foundUser.id)) {
      return res.status(404).send({
        message: "You don't belong to a company",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const { id } = req.params;
    const foundOrder = await OrderModel.findOne({
      id,
      idCompany: foundCompany.id,
    }).select("-__v -_id ");
    if (
      !foundOrder ||
      !foundOrder.orders.includes(id) ||
      !foundCompany.restaurants.includes(foundOrder.restaurant)
    ) {
      return res.status(404).send({
        message: "Order not found or doesn't belong to your company",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }

    res.status(200).send({
      message: "Fetched order",
      code: 200,
      success: true,
      date: Date.now(),
      data: foundOrder,
    });
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from getOrderDetails endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.jumiaLogin = async (req, res) => {
  try {
    const token = req.headers["x-order-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);

    const foundUser = await UserModel.findOne({
      id: user.id,
    });
    const foundCompany = await CompanyModel.findOne({
      id: foundUser.idCompany,
    });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    if (!foundCompany || !foundCompany.users.includes(foundUser.id)) {
      return res.status(404).send({
        message: "You don't belong to a company",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const foundJumia = await JumiaModel.findOne({
      idCompany: foundCompany.id,
    });
    if (!foundJumia)
      return res.status(404).send({
        message: "Not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    const email = decryptData(foundJumia.email);
    const password = decryptData(foundJumia.password);

    await axios
      .post("https://vendor-global-api.food.jumia.com.tn/v1/login", {
        email,
        password,
      })
      .then(async (result) => {
        if (result.data.token) {
          foundJumia.token = encryptData(result.data.token);
          await foundJumia.save();
          return res.status(200).send({
            message: "Success",
            code: 200,
            success: false,
            date: Date.now(),
          });
        } else {
          return res.status(401).send({
            message: "Wrong credentials",
            code: 401,
            success: false,
            date: Date.now(),
          });
        }
      })
      .catch((err) => {
        return res.status(400).send({
          message: "Something went wrong with the connection to Jumia",
          code: 400,
          success: false,
          date: Date.now(),
        });
      });
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from jumiaLogin endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.importJumiaOrders = async (req, res) => {
  try {
    const token = req.headers["x-order-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);

    const foundUser = await UserModel.findOne({
      id: user.id,
    });
    const foundCompany = await CompanyModel.findOne({
      id: foundUser.idCompany,
    });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    if (!foundCompany || !foundCompany.users.includes(foundUser.id)) {
      return res.status(404).send({
        message: "You don't belong to a company",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const foundJumia = await JumiaModel.findOne({
      id: foundCompany.idJumia,
      idCompany: foundCompany.id,
      isActive: true,
    });
    if (!foundJumia) {
      return res.status(404).send({
        message: "Not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const foundJumiaVendors = await RestaurantModel.find({
      importedFrom: "jumia",
      idCompany: foundCompany.id,
      isArchived: false,
      isActive: true,
    });
    if (!foundJumiaVendors || foundJumiaVendors.length === 0) {
      return res.status(401).send({
        message: "Please import Jumia vendors before importing orders",
        code: 401,
        success: false,
        date: Date.now(),
      });
    }
    const headers = {
      Authorization: "Bearer " + decryptData(foundJumia.token),
    };
    const { limit, page } = req.body;
    await axios
      .get(
        `https://vendor-global-api.food.jumia.com.tn/v1/orders?limit=${
          limit || 100
        }&page=${page || 1}`,
        { headers }
      )
      .then(async (result) => {
        const orderList = result.data;
        const myPromise = orderList.map(async (order) => {
          await axios
            .get(
              `https://vendor-global-api.food.jumia.com.tn/v1/orders/${order.id}`,
              { headers }
            )
            // Fetched order details
            .then(async (orderResult) => {
              const orderJumia = orderResult.data;
              const foundJumiaOrder = await JumiaOrderModel.findOne({
                "details.id": orderJumia.id,
              });
              // If Jumia order doesn't exist, add it
              if (!foundJumiaOrder) {
                const idJumiaOrder = uuidv4();
                let newJumiaOrder = new JumiaOrderModel({
                  id: idJumiaOrder,
                  details: orderJumia,
                });
                // Sync Jumia's order to our order schema
                const formattedValues = await formatOrder(
                  orderJumia,
                  idJumiaOrder,
                  foundCompany.id
                );
                let newOrder = new OrderModel(formattedValues);
                // Replace Jumia's vendor id with our vendor's id
                const foundVendor = await RestaurantModel.findOne({
                  idCompany: foundCompany.id,
                  importedFrom: "jumia",
                  importedId: orderJumia.vendorId,
                });
                newOrder.restaurant = foundVendor.id;
                // Push order's id to the respective vendor
                foundVendor.orders.push(newOrder.id);
                // Sync Jumia's order's products with our product order schema
                let products = [];
                const productsPromise = orderJumia.products.map(
                  async (product) => {
                    let object = {
                      product: "",
                      quantity: 0,
                      extra: [],
                      choices: [],
                    };
                    // Replace Jumia's product id with our product's id
                    const foundProduct = await ProductModel.findOne({
                      importedFrom: "jumia",
                      importedId: product.productId,
                      idCompany: foundCompany.id,
                    });
                    object.product = foundProduct.id;
                    object.quantity = product.quantity;
                    // Format choices & toppings id's as our choices & supplements id's
                    const toppingsArray = Object.values(
                      product?.extras?.toppings
                    ).flatMap((toppingGroup) => {
                      return toppingGroup.map((topping) => topping.productId);
                    });

                    const choicesArray = Object.values(
                      product?.extras?.choices
                    ).flatMap((choiceGroup) => {
                      return choiceGroup.map((choice) => choice.productId);
                    });
                    const foundSupplements = await IngredientModel.find({
                      importedId: { $in: toppingsArray },
                      importedFrom: "jumia",
                      idCompany: foundCompany.id,
                    });
                    foundSupplements.map((supplement) =>
                      object.extra.push(supplement.id)
                    );
                    const foundIngredients = await IngredientModel.find({
                      importedId: { $in: choicesArray },
                      importedFrom: "jumia",
                      idCompany: foundCompany.id,
                    });
                    foundIngredients.map((ingredient) =>
                      object.choices.push(ingredient.id)
                    );
                    products.push(object);
                  }
                );
                await Promise.all(productsPromise);
                newOrder.products = products;
                await foundVendor.save();
                await newOrder.save();
                await newJumiaOrder.save();
              }
            });
        });
        await Promise.all(myPromise);
        res.status(200).send({
          message: "Success",
          code: 200,
          success: false,
          date: Date.now(),
        });
      })
      .catch((err) => {
        return res.status(400).send({
          message: "Something went wrong with the connection to Jumia",
          code: 400,
          success: false,
          date: Date.now(),
        });
      });
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from importJumiaOrders endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.importJumiaVendors = async (req, res) => {
  try {
    const token = req.headers["x-order-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);

    const foundUser = await UserModel.findOne({
      id: user.id,
    });
    const foundCompany = await CompanyModel.findOne({
      id: foundUser.idCompany,
    });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    if (!foundCompany || !foundCompany.users.includes(foundUser.id)) {
      return res.status(404).send({
        message: "You don't belong to a company",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }

    const foundJumia = await JumiaModel.findOne({
      id: foundCompany.idJumia,
      idCompany: foundCompany.id,
      isActive: true,
    });
    if (!foundJumia) {
      return res.status(404).send({
        message: "Partner not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const headers = {
      Authorization: "Bearer " + decryptData(foundJumia.token),
    };
    await axios
      .get("https://vendor-global-api.food.jumia.com.tn/v1/vendors", {
        headers,
      })
      .then(async (vendorsList) => {
        const vendors = vendorsList.data;
        // Fetch all Jumia's vendor's categories
        const vendorsPromise = vendors.map(async (vendor) => {
          const formattedValues = await formatVendor(vendor, foundCompany.id);
          let newVendor = new RestaurantModel(formattedValues);
          await newVendor.save();
          foundCompany.restaurants.push(newVendor.id);
        });
        await Promise.all(vendorsPromise);
        await foundCompany.save();
        return res.status(200).send({
          message: "Successfully imported vendors",
          code: 200,
          success: true,
          date: Date.now(),
        });
      })
      .catch((err) => {
        console.log(err);
        res.status(400).send({
          message: "Something went wrong",
          code: 400,
          requestDate: Date.now(),
          success: false,
        });
      });
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from importJumiaVendors endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.importJumiaCategories = async (req, res) => {
  try {
    const token = req.headers["x-order-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);

    const foundUser = await UserModel.findOne({
      id: user.id,
    });
    const foundCompany = await CompanyModel.findOne({
      id: foundUser.idCompany,
    });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    if (!foundCompany || !foundCompany.users.includes(foundUser.id)) {
      return res.status(404).send({
        message: "You don't belong to a company",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }

    const foundJumia = await JumiaModel.findOne({
      id: foundCompany.idJumia,
      idCompany: foundCompany.id,
      isActive: true,
    });
    if (!foundJumia) {
      return res.status(404).send({
        message: "Partner not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const headers = {
      Authorization: "Bearer " + decryptData(foundJumia.token),
    };

    const foundJumiaVendors = await RestaurantModel.find({
      idCompany: foundCompany.id,
      importedFrom: "jumia",
      isArchived: false,
    });
    if (!foundJumiaVendors || foundJumiaVendors.length === 0) {
      return res.status(406).send({
        message: "Please import Jumia vendors first",
        code: 406,
        success: false,
        date: Date.now(),
      });
    }
    // Fetch all Jumia's vendor's categories
    const categoriesPromise = foundJumiaVendors.map(async (vendor) => {
      await axios
        .get(
          `https://vendor-global-api.food.jumia.com.tn/v1/vendors/${vendor.importedId}/categories`,
          { headers }
        )
        .then(async (categoriesList) => {
          const categories = categoriesList.data;
          const insidePromise = categories.map(async (category) => {
            const foundCategory = await CategoryModel.findOne({
              idCompany: foundCompany.id,
              importedFrom: "jumia",
              importedId: category.id,
            });
            if (!foundCategory) {
              // Format category data
              const formattedValues = await formatCategory(
                category,
                foundCompany.id
              );
              let newCategory = new CategoryModel(formattedValues);

              const foundVendor = await RestaurantModel.findOne({
                idCompany: foundCompany.id,
                importedFrom: "jumia",
                importedId: vendor.importedId,
              });
              if (foundVendor) {
                newCategory.restaurants.push(foundVendor.id);
                foundVendor.categories.push(newCategory.id);
                await foundVendor.save();
              }
              await newCategory.save();
            }
          });
          await Promise.all(insidePromise);
        });
    });
    await Promise.all(categoriesPromise);
    return res.status(200).send({
      message: "Successfully imported categories",
      code: 200,
      success: true,
      date: Date.now(),
    });
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from importJumiaCategories endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};
exports.importJumiaSupplements = async (req, res) => {
  try {
    const token = req.headers["x-order-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);

    const foundUser = await UserModel.findOne({
      id: user.id,
    });
    const foundCompany = await CompanyModel.findOne({
      id: foundUser.idCompany,
    });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    if (!foundCompany || !foundCompany.users.includes(foundUser.id)) {
      return res.status(404).send({
        message: "You don't belong to a company",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }

    const foundJumia = await JumiaModel.findOne({
      id: foundCompany.idJumia,
      idCompany: foundCompany.id,
      isActive: true,
    });
    if (!foundJumia) {
      return res.status(404).send({
        message: "Partner not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const headers = {
      Authorization: "Bearer " + decryptData(foundJumia.token),
    };
    const foundJumiaVendors = await RestaurantModel.find({
      idCompany: foundCompany.id,
      importedFrom: "jumia",
      isArchived: false,
    });
    if (!foundJumiaVendors || foundJumiaVendors.length === 0) {
      return res.status(204).send({
        message: "Please import Jumia vendors first",
        code: 204,
        success: false,
        date: Date.now(),
      });
    }

    // Fetch all Jumia's vendor's categories
    const ingredientsPromise = foundJumiaVendors.map(async (vendor) => {
      await axios
        .get(
          `https://vendor-global-api.food.jumia.com.tn/v1/vendors/${vendor.importedId}/toppings-choices-templates`,
          { headers }
        )
        .then(async (toppingsChoicesList) => {
          const toppingsList = toppingsChoicesList.data.toppings;
          const toppingsPromise = toppingsList.map(async (supplement) => {
            await axios
              .get(
                `https://vendor-global-api.food.jumia.com.tn/v1/vendors/${vendor.importedId}/toppings/${supplement.id}/products`,
                { headers }
              )
              .then(async (result) => {
                const supplements = result.data.toppingProducts;
                const insidePromise = supplements.map(async (supp) => {
                  const foundSupplement = await ProductModel.findOne({
                    idCompany: foundCompany.id,
                    importedFrom: "jumia",
                    importedId: supp.id,
                  });
                  if (!foundSupplement) {
                    const formattedValues = await formatSupplement(
                      supp,
                      foundCompany.id
                    );
                    let newSupplement = new IngredientModel(formattedValues);

                    const foundVendor = await RestaurantModel.findOne({
                      idCompany: foundCompany.id,
                      importedFrom: "jumia",
                      importedId: vendor.importedId,
                    });
                    if (foundVendor) {
                      newSupplement.restaurants.push(foundVendor.id);
                      foundVendor.ingredients.push(newSupplement.id);
                      await foundVendor.save();
                    }
                    await newSupplement.save();
                  }
                });
                await Promise.all(insidePromise);
              });
          });

          await Promise.all(toppingsPromise);
        });
    });
    await Promise.all(ingredientsPromise);
    return res.status(200).send({
      message: "Successfully imported supplements",
      code: 200,
      success: true,
      date: Date.now(),
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      message:
        "This error is coming from importJumiaSupplements endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.importJumiaIngredients = async (req, res) => {
  try {
    const token = req.headers["x-order-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);

    const foundUser = await UserModel.findOne({
      id: user.id,
    });
    const foundCompany = await CompanyModel.findOne({
      id: foundUser.idCompany,
    });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    if (!foundCompany || !foundCompany.users.includes(foundUser.id)) {
      return res.status(404).send({
        message: "You don't belong to a company",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }

    const foundJumia = await JumiaModel.findOne({
      id: foundCompany.idJumia,
      idCompany: foundCompany.id,
      isActive: true,
    });
    if (!foundJumia) {
      return res.status(404).send({
        message: "Partner not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const headers = {
      Authorization: "Bearer " + decryptData(foundJumia.token),
    };
    const foundJumiaVendors = await RestaurantModel.find({
      idCompany: foundCompany.id,
      importedFrom: "jumia",
      isArchived: false,
    });
    if (!foundJumiaVendors || foundJumiaVendors.length === 0) {
      return res.status(204).send({
        message: "Please import Jumia vendors first",
        code: 204,
        success: false,
        date: Date.now(),
      });
    }

    // Fetch all Jumia's vendor's categories
    const ingredientsPromise = foundJumiaVendors.map(async (vendor) => {
      await axios
        .get(
          `https://vendor-global-api.food.jumia.com.tn/v1/vendors/${vendor.importedId}/toppings-choices-templates`,
          { headers }
        )
        .then(async (toppingsChoicesList) => {
          const choicesList = toppingsChoicesList.data.choices;
          const choicesPromise = choicesList.map(async (choice) => {
            await axios
              .get(
                `https://vendor-global-api.food.jumia.com.tn/v1/vendors/${vendor.importedId}/choices/${choice.id}/products`,
                { headers }
              )
              .then(async (result) => {
                const choices = result.data.choiceProducts;
                const insidePromise = choices.map(async (ingredient) => {
                  const foundIngredient = await IngredientModel.findOne({
                    idCompany: foundCompany.id,
                    importedFrom: "jumia",
                    importedId: ingredient.id,
                  });
                  if (!foundIngredient) {
                    const formattedValues = await formatIngredient(
                      ingredient,
                      foundCompany.id
                    );
                    let newIngredient = new IngredientModel(formattedValues);

                    const foundVendor = await RestaurantModel.findOne({
                      idCompany: foundCompany.id,
                      importedFrom: "jumia",
                      importedId: vendor.importedId,
                    });
                    if (foundVendor) {
                      newIngredient.restaurants.push(foundVendor.id);
                      foundVendor.ingredients.push(newIngredient.id);
                      await foundVendor.save();
                    }
                    await newIngredient.save();
                  }
                });
                await Promise.all(insidePromise);
              });
          });

          await Promise.all(choicesPromise);
        });
    });
    await Promise.all(ingredientsPromise);
    return res.status(200).send({
      message: "Successfully imported ingredients",
      code: 200,
      success: true,
      date: Date.now(),
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      message:
        "This error is coming from importJumiaIngredients endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

// const ingredients = ingredientList.data;
// const insidePromise = ingredients.map(async (ingredient) => {
//   // Format category data
//   const formattedValues = await formatIngredients(ingredient);
//   let newIngredient = new IngredientModel(formattedValues);
//   await newIngredient.save();
// });
// await Promise.all(insidePromise);
exports.importJumiaProducts = async (req, res) => {
  try {
    const token = req.headers["x-order-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);

    const foundUser = await UserModel.findOne({
      id: user.id,
    });
    const foundCompany = await CompanyModel.findOne({
      id: foundUser.idCompany,
    });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    if (!foundCompany || !foundCompany.users.includes(foundUser.id)) {
      return res.status(404).send({
        message: "You don't belong to a company",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }

    const foundJumia = await JumiaModel.findOne({
      id: foundCompany.idJumia,
      idCompany: foundCompany.id,
      isActive: true,
    });
    if (!foundJumia) {
      return res.status(404).send({
        message: "Partner not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const headers = {
      Authorization: "Bearer " + decryptData(foundJumia.token),
    };
    const foundJumiaVendors = await RestaurantModel.find({
      idCompany: foundCompany.id,
      importedFrom: "jumia",
      isArchived: false,
    });
    if (!foundJumiaVendors || foundJumiaVendors.length === 0) {
      return res.status(406).send({
        message: "Please import Jumia vendors first",
        code: 406,
        success: false,
        date: Date.now(),
      });
    }

    // Fetch all Jumia's vendor's categories
    const productsPromise = foundJumiaVendors.map(async (vendor) => {
      const foundJumiaCategories = await CategoryModel.find({
        importedFrom: "jumia",
        idCompany: foundCompany.id,
        isArchived: false,
      });
      if (!foundJumiaCategories || foundJumiaCategories.length === 0)
        return res.status(401).send({
          message: "Please import categories from Jumia first",
          code: 401,
          success: false,
          date: Date.now(),
        });
      const insidePromise = foundJumiaCategories.map(async (category) => {
        await axios
          .get(
            `https://vendor-global-api.food.jumia.com.tn/v1/vendors/${vendor.importedId}/categories/${category.importedId}/products`,
            { headers }
          )
          .then(async (productsList) => {
            const products = productsList.data.products;
            const promise = products.map(async (product) => {
              const foundProduct = await ProductModel.findOne({
                idCompany: foundCompany.id,
                importedFrom: "jumia",
                importedId: product.id,
              });
              if (!foundProduct) {
                // Format category data
                const formattedValues = await formatProducts(
                  product,
                  foundCompany.id
                );
                let newProduct = new ProductModel(formattedValues);
                const foundCategory = await CategoryModel.findOne({
                  idCompany: foundCompany.id,
                  importedFrom: "jumia",
                  importedId: product.category,
                });
                newProduct.category = foundCategory.id;
                const foundVendor = await RestaurantModel.findOne({
                  idCompany: foundCompany.id,
                  importedFrom: "jumia",
                  importedId: vendor.importedId,
                });
                if (foundVendor) {
                  newProduct.restaurants.push(foundVendor.id);
                  foundVendor.products.push(newProduct.id);
                  await foundVendor.save();
                }
                await newProduct.save();
              }
            });
            await Promise.all(promise);
          });
      });
      await Promise.all(insidePromise);
    });
    await Promise.all(productsPromise);
    return res.status(200).send({
      message: "Successfully imported products",
      code: 200,
      success: true,
      date: Date.now(),
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      message:
        "This error is coming from importJumiaProducts endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};
