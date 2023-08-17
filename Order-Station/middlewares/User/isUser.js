const jwt = require("jsonwebtoken");

exports.isUser = async (req, res, next) => {
  const token = req.headers["x-order-token"];
  if (!token) {
    res.status(403).send({
      message: "Please provide order station token in the headers",
      code: 403,
      success: false,
      date: Date.now(),
    });
  } else {
    try {
      const user = jwt.verify(token, process.env.SECRET_KEY);
      if (user.role != "admin" && user.role != "rh") {
        return res.status(403).send({
          message: "Not authorized",
          code: 403,
          success: false,
          date: Date.now(),
        });
      }
      if (req.route.path === "/auth") {
        res.status(200).send({
          message: "Authorized",
          code: 200,
          success: true,
          date: Date.now(),
        });
      } else {
        next();
      }
    } catch (err) {
      res.status(500).send({
        message:
          "This error is coming from isUser middleware, please report to the sys useristrator !",
        code: 500,
        success: false,
        date: Date.now(),
      });
    }
  }
};
