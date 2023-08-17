const axios = require("axios");

// This array will hold the fetched orders to avoid duplicates
let fetchedOrders = [];

// Fetch new orders and emit to Socket.IO
const fetchAndEmitOrders = async (idCompany) => {
  try {
    const recentOrdersResponse = await axios.get(
      "https://vendor-global-api.food.jumia.com.tn/v1/orders/new?limit=10&page=1"
    );

    const allOrders = allOrdersResponse.data;
    const recentOrders = recentOrdersResponse.data.filter(
      (order) => !fetchedOrders.includes(order.id)
    );

    if (recentOrders.length > 0) {
      fetchedOrders = fetchedOrders.concat(
        recentOrders.map((order) => order.id)
      );
      io.to("order-channel").emit("new-orders", recentOrders);
    }
  } catch (error) {
    console.error("Error fetching orders:", error);
  }
};

module.exports = { fetchAndEmitOrders };
