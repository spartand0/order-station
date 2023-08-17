const UserModel = require("../models/User/User");
const CompanyModel = require("../models/Company/Company");
const OrderModel = require("../models/Restaurant/Order");
const RestaurantModel = require("../models/Restaurant/Restaurant");
const IngredientModel = require("../models/Restaurant/Ingredient");
const ProductModel = require("../models/Restaurant/Product");
const CategoryModel = require("../models/Restaurant/Category");
const TableModel = require("../models/Restaurant/Table");
const CouponModel = require("../models/Restaurant/Coupon");
const { v4: uuidv4 } = require("uuid");

exports.getCategories = async (req, res) => {
  try {
    const { idCompany, idVendor } = req.params;

    if (!idCompany || !idVendor) {
      return res.status(400).send({
        message: "Missing details",
        code: 400,
        success: false,
        date: Date.now(),
      });
    }

    const foundCompany = await CompanyModel.findOne({
      id: idCompany,
      isArchived: false,
    });
    const foundRestaurant = await RestaurantModel.findOne({
      id: idVendor,
      isArchived: false,
      idCompany: foundCompany.id,
    });
    if (!foundCompany) {
      return res.status(404).send({
        message: "Company not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }

    if (
      !foundRestaurant ||
      !foundCompany.restaurants.includes(foundRestaurant.id)
    ) {
      return res.status(404).send({
        message: "Vendor not found or doesn't belong to this company",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const foundCategories = await CategoryModel.find({
      id: { $in: foundRestaurant.categories },
      isArchived: false,
      idCompany: foundCompany.id,
    }).select("id name image priority -_id");
    return res.status(200).send({
      message: "Fetched categories",
      code: 200,
      success: true,
      date: Date.now(),
      data: foundCategories,
    });
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

exports.createOrder = async (req, res) => {
  try {
    const { idCompany } = req.params;

    if (!idCompany) {
      return res.status(400).send({
        message: "Missing details",
        code: 400,
        success: false,
        date: Date.now(),
      });
    }
    const foundCompany = await CompanyModel.findOne({
      id: idCompany,
      isArchived: false,
    });

    if (!foundCompany) {
      return res.status(404).send({
        message: "Company not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const { table, isPickup, usedCoupon, waiter, products, restaurant } =
      req.body;

    // Check if there's any missing arguments
    if (!table || !waiter || !products || !restaurant) {
      return res.status(400).send({
        message: "Missing details",
        code: 400,
        success: false,
        date: Date.now(),
      });
    }
    // Check viablity of the vendor
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
    // Check viablity of the table and check if it's available
    // Later when we add online payment, open/close table automatically
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
    // Check viablity of the waiter
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
    // Create new instance of an Order
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
      usedCoupon,
      productsTotalPrice: 0,
    });
    // Start calculating products price
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
      // Test choices viability
      if (product.choices && product.choices[0]) {
        for (let ingredient of product.choices) {
          const foundIngredient = await IngredientModel.findOne({
            id: ingredient,
            isSupplement: false,
            idCompany: foundCompany.id,
            isArchived: false,
          });
          if (!foundIngredient) {
            return res.status(404).send({
              message: "Ingredient not found or doesn't belong to this vendor",
              code: 404,
              success: false,
              date: Date.now(),
            });
          }
        }
      }
      // Test supplements viability and add to products total price
      if (product.extra && product.extra[0]) {
        const extras = await IngredientModel.find({
          id: { $in: product.extra },
          isSupplement: true,
          idCompany: foundCompany.id,
          isArchived: false,
        });
        if (extras && extras[0]) {
          for (let extra of extras) {
            productsTotal += extra.price;
          }
        }
      }
    }
    newOrder.productsTotalPrice = productsTotal;
    // Check if coupon exists, dicount the amount
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
        } else if (foundCoupon.quantity - 1 === 0) {
          foundCoupon.quantity -= 1;
          foundCoupon.isActive = false;
          return res.status(406).send({
            message: "Coupon ran out",
            code: 406,
            success: false,
            date: Date.now(),
          });
        } else {
          foundCoupon.quantity -= 1;
        }
      } else if (foundCoupon.isUsed) {
        return res.status(406).send({
          message: "Coupon already used",
          code: 406,
          success: false,
          date: Date.now(),
        });
      } else if (
        foundCoupon.startDate &&
        new Date(foundCoupon.startDate) > new Date()
      ) {
        return res.status(406).send({
          message: "Coupon can't be used yet",
          code: 406,
          success: false,
          date: Date.now(),
        });
      } else if (
        foundCoupon.endDate &&
        new Date(foundCoupon.endDate) < new Date()
      ) {
        return res.status(406).send({
          message: "Coupon expired",
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

        newOrder.totalPrice += newOrder.productsTotalPrice - discountedAmount;

        newOrder.discountedAmount = discountedAmount;
      } else {
        discountedAmount = foundCoupon.amount;
        newOrder.totalPrice += newOrder.productsTotalPrice - discountedAmount;
        newOrder.discountedAmount = discountedAmount;
      }
      await foundCoupon.save();
    }
    // Calculate TVA
    // newOrder.totalPrice +=
    //   newOrder.productsTotalPrice +
    //   (newOrder.productsTotalPrice * newOrder.tva) / 100;

    // Check if there are delivery fees
    if (newOrder.deliveryFee > 0) {
      newOrder.totalPrice += newOrder.deliveryFee;
    }

    // Save order details and add order id to the vendor's list
    foundRestaurant.orders.push(idOrder);
    await foundRestaurant.save();
    await newOrder.save();
    res.status(200).send({
      message: "Created order",
      code: 200,
      success: true,
      date: Date.now(),
      data: newOrder,
    });
    // Change table status if not pick up
    if (!isPickup) {
      foundTable.isAvailable = false;
      foundTable.order = idOrder;
      foundTable.save();
    }
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
    const { idCompany, idOrder } = req.params;

    if (!idCompany || !idOrder) {
      return res.status(400).send({
        message: "Missing details",
        code: 400,
        success: false,
        date: Date.now(),
      });
    }

    const foundCompany = await CompanyModel.findOne({
      id: idCompany,
      isArchived: false,
    });
    if (!foundCompany) {
      return res.status(404).send({
        message: "Company not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    let foundOrder = await OrderModel.findOne({
      id: idOrder,
      isArchived: false,
      idCompany: foundCompany.id,
    }).select("-_id -__v");

    if (!foundOrder) {
      return res.status(404).send({
        message: "Order not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const foundWaiter = await UserModel.findOne({
      id: foundOrder.waiter,
      isArchived: false,
      idCompany: foundCompany.id,
    });
    foundOrder.waiter = foundWaiter.name + " " + foundWaiter.surname;
    const foundTable = await TableModel.findOne({
      id: foundOrder.table,
      isArchived: false,
      idCompany: foundCompany.id,
    });
    foundOrder.table = foundTable.tableNumber;
    const foundRestaurant = await RestaurantModel.findOne({
      id: foundOrder.restaurant,
      isArchived: false,
      idCompany: foundCompany.id,
    });
    foundOrder.restaurant = foundRestaurant.name;
    const myPromise = foundOrder.products.map(async (object) => {
      const foundProduct = await ProductModel.findOne({
        id: object.productID,
        isArchived: false,
        idCompany: foundCompany.id,
      });
      object.productID = foundProduct.name;
      const foundIngredients = await IngredientModel.find({
        id: { $in: object.choices },
        isArchived: false,
        isSupplement: false,
        idCompany: foundCompany.id,
      }).select("name -_id");
      object.choices = foundIngredients;
      const foundSupplements = await IngredientModel.find({
        id: { $in: object.extra },
        isArchived: false,
        isSupplement: true,
        idCompany: foundCompany.id,
      }).select("name -_id");
      object.extra = foundSupplements;
    });
    await Promise.all(myPromise);
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

exports.getTableStatus = async (req, res) => {
  try {
    const { idCompany, idTable } = req.params;
    if (!idCompany || !idTable) {
      return res.status(400).send({
        message: "Missing details",
        code: 400,
        success: false,
        date: Date.now(),
      });
    }

    const foundCompany = await CompanyModel.findOne({
      id: idCompany,
      isArchived: false,
    });
    if (!foundCompany) {
      return res.status(404).send({
        message: "Company not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const foundTable = await TableModel.findOne({
      id: idTable,
      isArchived: false,
      idCompany: foundCompany.id,
    }).select("id tableNumber isAvailable order -_id");
    if (!foundTable) {
      return res.status(404).send({
        message: "Table not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }

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
        "This error is coming from getTableStatus endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.getVendors = async (req, res) => {
  try {
    const { idCompany } = req.params;

    if (!idCompany) {
      return res.status(400).send({
        message: "Missing details",
        code: 400,
        success: false,
        date: Date.now(),
      });
    }
    const foundCompany = await CompanyModel.findOne({
      id: idCompany,
      isArchived: false,
    });

    if (!foundCompany) {
      return res.status(404).send({
        message: "Company not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const foundRestaurants = await RestaurantModel.find({
      id: { $in: foundCompany.restaurants },
      idCompany: foundCompany.id,
      isArchived: false,
    }).select("id name description specialty address logo cover -_id");
    return res.status(200).send({
      message: "Fetched vendors",
      code: 200,
      success: true,
      date: Date.now(),
      data: foundRestaurants,
    });
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

exports.getProducts = async (req, res) => {
  try {
    const { idCompany, idVendor } = req.params;

    if (!idCompany || !idVendor) {
      return res.status(400).send({
        message: "Missing details",
        code: 400,
        success: false,
        date: Date.now(),
      });
    }

    const foundCompany = await CompanyModel.findOne({
      id: idCompany,
      isArchived: false,
    });
    if (!foundCompany) {
      return res.status(404).send({
        message: "Company not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const foundRestaurant = await RestaurantModel.findOne({
      id: idVendor,
      isArchived: false,
      idCompany: foundCompany.id,
    });

    if (
      !foundRestaurant ||
      !foundCompany.restaurants.includes(foundRestaurant.id)
    ) {
      return res.status(404).send({
        message: "Vendor not found or doesn't belong to this company",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const foundProducts = await ProductModel.find({
      id: { $in: foundRestaurant.products },
      isArchived: false,
      idCompany: foundCompany.id,
    }).select(
      "id name description composable category image priority promoPrice price -_id"
    );
    return res.status(200).send({
      message: "Fetched products",
      code: 200,
      success: true,
      date: Date.now(),
      data: foundProducts,
    });
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

exports.getProductChoices = async (req, res) => {
  try {
    const { idCompany, idProduct } = req.params;

    if (!idCompany || !idProduct) {
      return res.status(400).send({
        message: "Missing details",
        code: 400,
        success: false,
        date: Date.now(),
      });
    }

    const foundCompany = await CompanyModel.findOne({
      id: idCompany,
      isArchived: false,
    });
    if (!foundCompany) {
      return res.status(404).send({
        message: "Company not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const foundProduct = await ProductModel.findOne({
      id: idProduct,
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
    let choicesTab = [];
    const myPromise = foundProduct.choices.map(async (choice) => {
      let object = {
        question: choice.question,
        ingredients: [],
      };
      const insidePromise = choice.ingredients.map(async (ingredient) => {
        const foundIngredient = await IngredientModel.findOne({
          id: ingredient,
          isArchived: false,
          idCompany: foundCompany.id,
          isSupplement: false,
        });
        object.ingredients.push({
          id: foundIngredient.id,
          name: foundIngredient.name,
        });
      });
      await Promise.all(insidePromise);
      choicesTab.push(object);
    });
    await Promise.all(myPromise);

    return res.status(200).send({
      message: "Fetched choices",
      code: 200,
      success: true,
      date: Date.now(),
      data: choicesTab,
    });
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from getProductChoices endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.getProductSupplements = async (req, res) => {
  try {
    const { idCompany, idProduct } = req.params;

    if (!idCompany || !idProduct) {
      return res.status(400).send({
        message: "Missing details",
        code: 400,
        success: false,
        date: Date.now(),
      });
    }

    const foundCompany = await CompanyModel.findOne({
      id: idCompany,
      isArchived: false,
    });
    if (!foundCompany) {
      return res.status(404).send({
        message: "Company not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const foundProduct = await ProductModel.findOne({
      id: idProduct,
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
      idCompany: foundCompany.id,
      isArchived: false,
      isSupplement: true,
    }).select("id name price priority -_id");

    return res.status(200).send({
      message: "Fetched supplements",
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
