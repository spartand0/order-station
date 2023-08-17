const jwt = require("jsonwebtoken");

exports.isAdmin = async (req, res, next) => {
  const token = req.headers["x-order-token"];
  if (!token) {
    res.status(403).send({
      message: "Please provide semsem token in the cookies",
      code: 403,
      success: false,
      date: Date.now(),
    });
  } else {
    try {
      const admin = jwt.verify(token, process.env.SECRET_KEY);
      if (admin.role != "commercial" && admin.role != "superadmin") {
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
          "This error is coming from isAdmin middleware, please report to the sys administrator !",
        code: 500,
        success: false,
        date: Date.now(),
      });
    }
  }
};
