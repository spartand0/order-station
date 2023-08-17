const express = require("express");
const connectDB = require("./config/connectDB");
const morgan = require("morgan");
const User = require("./routes/User");
const Admin = require("./routes/Admin");
const Auth = require("./routes/Auth");
const Scan = require("./routes/Scan");
var bodyParser = require("body-parser");
var cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
const cors = require("cors");

const {
  ValidationError,
  NotFoundError,
  DBError,
  ConstraintViolationError,
  UniqueViolationError,
  NotNullViolationError,
  ForeignKeyViolationError,
  CheckViolationError,
  DataError,
} = require("objection");

//environement
require("dotenv").config({ path: "./config/.env" });

//app
const app = express();

app.use(morgan("dev"));
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(
  bodyParser.urlencoded({
    limit: "50mb",
    extended: true,
  })
);
app.use(cookieParser()); //routes
app.use(express.json({ limit: "50mb" }));

app.use(function (req, res, next) {
  res.header("Content-Type", "application/json;charset=UTF-8");
  res.header("Access-Control-Allow-Credentials", true);
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

// Ping - Pong API health check
app.get("/ping", (req, res) => {
  res.json({ message: "pong" });
});

app.use("/api/user", User, function (req, res) {
  res.header("Access-Control-Allow-Origin", "*");
});
app.use("/api/admin", Admin, function (req, res) {
  res.header("Access-Control-Allow-Origin", "*");
});
app.use("/api/auth", Auth, function (req, res) {
  res.header("Access-Control-Allow-Origin", "*");
});
app.use("/api/scan", Scan, function (req, res) {
  res.header("Access-Control-Allow-Origin", "*");
});

app.use(async function (err, req, res, next) {
  augmentObjectionError(err);
  const { message, status = null } = err;
  console.log(message, status);
  res.status(Number(err.status) || 500).json({
    code: status,
    description: message,
  });
});

function augmentObjectionError(err, res) {
  if (err instanceof ValidationError) {
    err.status = 400;
  } else if (err instanceof NotFoundError) {
    err.status = 404;
  } else if (err instanceof UniqueViolationError) {
    err.status = 409;
  } else if (err instanceof NotNullViolationError) {
    err.status = 400;
  } else if (err instanceof ForeignKeyViolationError) {
    err.status = 409;
  } else if (err instanceof CheckViolationError) {
    err.status = 400;
  } else if (err instanceof ConstraintViolationError) {
    err.status = 409;
  } else if (err instanceof DataError) {
    err.status = 400;
  } else if (err instanceof DBError) {
    err.status = 500;
  } else {
    err.status = 500;
  }
}

//db Connect
connectDB();
mongoose.Promise = global.Promise;

//middlewares

//port
port = process.env.PORT;
app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
