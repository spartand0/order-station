const mongoose = require("mongoose");
require("dotenv").config();

const connectDB = () => {
  mongoose.set("strictQuery", true);
  mongoose
    .connect(process.env.dbName, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then(() => console.log("Database connected!"))
    .catch((error) => console.log(error));
};

module.exports = connectDB;
