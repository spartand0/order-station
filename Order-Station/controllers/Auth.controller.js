const UserModel = require("../models/User/User");
const AdminModel = require("../models/Admin/Admin");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

exports.resetPassword = async (req, res) => {
  try {
    var { email } = req.body;
    email = email.toLowerCase();
    let foundUser = await UserModel.findOne({ email, isArchived: false });
    let foundAdmin = await AdminModel.findOne({ email, isArchived: false });

    if (!foundUser && !foundAdmin)
      return res.status(404).send({
        message: "Account not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    if (foundUser) {
      const token = jwt.sign(
        {
          id: foundUser.id,
          role: foundUser.role,
          email: foundUser.email,
          subject: "resetPassword",
        },
        process.env.SECRET_KEY,
        { expiresIn: "24h" }
      );
      const resetLink =
        "https://dev-admin.semsemapp.com/reset-password/" + token;
      foundUser.token = token;
      await foundUser.save();

      // await resetPassword(
      //   email,
      //   resetLink,
      //   foundUser.firstName + "" + foundUser.lastName
      // );

      res.status(200).send({
        message: "Sent a verification link to your email.",
        code: 200,
        success: true,
        date: Date.now(),
        token,
      });
    } else if (foundAdmin) {
      const token = jwt.sign(
        {
          id: foundAdmin.id,
          role: foundAdmin.role,
          email: foundAdmin.email,
          subject: "resetPassword",
        },
        process.env.SECRET_KEY,
        { expiresIn: "24h" }
      );
      const resetLink =
        "https://dev-admin.semsemapp.com/reset-password/" + token;
      foundAdmin.token = token;
      await foundAdmin.save();

      // await resetPassword(email, resetLink, foundAdmin.userFullName);

      res.status(200).send({
        message: "Sent a verification link to your email.",
        code: 200,
        success: true,
        date: Date.now(),
        token,
      });
    }
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from resetPassword endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.confirmResetPassword = async (req, res) => {
  try {
    const token = req.headers["x-order-token"];
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    if (decoded.subject === "resetPassword") {
      var { password } = req.body;
      const foundAdmin = await AdminModel.findOne({
        id: decoded.id,
        isArchived: false,
      });
      const foundUser = await UserModel.findOne({
        id: decoded.id,
        isArchived: false,
      });

      if (foundUser && foundUser.token === token) {
        const isSame = await bcrypt.compare(password, foundUser.password);
        if (isSame) {
          return res.status(406).send({
            message: "Your new password cannot be your old one",
            code: 406,
            success: false,
            date: Date.now(),
          });
        }
        foundUser.token = "";
        foundUser.password = await bcrypt.hash(password, 10);
        await foundUser.save();
        res.status(200).send({
          message: "Password reset successfully",
          code: 200,
          success: true,
          date: Date.now(),
        });
      } else if (foundAdmin && foundAdmin.token === token) {
        foundAdmin.token = "";
        foundAdmin.password = await bcrypt.hash(password, 10);
        await foundAdmin.save();
        res.status(200).send({
          message: "Password reset successfully",
          code: 200,
          success: true,
          date: Date.now(),
        });
      } else {
        return res.status(404).send({
          message: "Account not found",
          code: 404,
          success: false,
          date: Date.now(),
        });
      }
    } else {
      res.status(403).send({
        message: "Invalid token",
        code: 403,
        success: false,
        date: Date.now(),
      });
    }
  } catch (err) {
    console.log(err);
    res.status(500).send({
      message:
        "This error is coming from confirmResetPassword endpoint, please report it to the sys administrator!",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};
