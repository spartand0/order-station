const { v4: uuidv4 } = require("uuid");

async function formatCategory(oldFormat, idCompany) {
  let newFormat = {
    id: uuidv4(),
    idCompany,
    name: oldFormat.title,
    image: oldFormat.categoryLogo,
    description: oldFormat.description,
    importedId: oldFormat.id,
    importedFrom: "jumia",
  };

  return newFormat;
}

async function formatSupplement(oldFormat, idCompany) {
  let newFormat = {
    id: uuidv4(),
    isSupplement: true,
    idCompany,
    name: oldFormat.product.name,
    price: oldFormat.price,
    image: oldFormat.product.productImage,
    importedId: oldFormat.product.id,
    importedFrom: "jumia",
  };

  return newFormat;
}

async function formatIngredient(oldFormat, idCompany) {
  let newFormat = {
    id: uuidv4(),
    isSupplement: false,
    idCompany,
    name: oldFormat.name,
    image: oldFormat.productImage,
    importedId: oldFormat.id,
    importedFrom: "jumia",
  };

  return newFormat;
}

async function formatVendor(oldFormat, idCompany) {
  let newFormat = {
    id: uuidv4(),
    idCompany,
    address: oldFormat.addressLine1,
    phone: oldFormat.customerPhone.match(/\d+/g).join(""),
    latitude: oldFormat.latitude,
    longitude: oldFormat.longitude,
    name: oldFormat.name,
    importedId: oldFormat.id,
    importedFrom: "jumia",
  };

  return newFormat;
}

async function formatOrder(oldFormat, idJumiaOrder, idCompany) {
  let newFormat = {
    id: uuidv4(),
    idCompany,
    platform: "jumia",
    importedFrom: "jumia",
    importedId: oldFormat.id,
    status: oldFormat.statusFlow[oldFormat.statusFlow.length - 1].code,
    idJumiaOrder,
    reference: oldFormat.code,
    createdAt: oldFormat.createdAt,
    jumiaStatusFlow: oldFormat.statusFlow,
    productsTotalPrice: oldFormat.subtotalValue,
    tva: oldFormat.vatAmount,
    deliveryFee: oldFormat.deliveryFee,
    totalPrice: oldFormat.totalValue,
    paymentMethod: oldFormat.paymentType.isOnlinePayment ? "online" : "cash",
    isPickup: oldFormat.isPickup,
    customerName: oldFormat.customerName,
    customerComment: oldFormat.customerComment,
  };

  return newFormat;
}

async function formatProducts(oldFormat, idCompany) {
  let newFormat = {
    id: uuidv4(),
    idCompany,
    name: oldFormat.name,
    description: oldFormat.description,
    category: oldFormat.category,
    // supplements: oldFormat.variations[0].toppings,
    price: oldFormat.variations[0].price,
    image: oldFormat.productImage,
    importedFrom: "jumia",
    importedId: oldFormat.id,
  };

  return newFormat;
}

module.exports = {
  formatSupplement,
  formatIngredient,
  formatOrder,
  formatVendor,
  formatCategory,
  formatProducts,
};
