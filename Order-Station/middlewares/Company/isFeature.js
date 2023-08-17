const FeatureModel = require("../../models/Company/Feature");

exports.isFeature = (featureName, type) => {
  return async (req, res, next) => {
    const foundFeature = await FeatureModel.findOne({
      featureName,
      isAvailable: true,
    });
    if (!foundFeature) {
      return res.status(404).send({
        message: "This endpoint is unavailable",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    if (type === "read" && foundFeature.canRead) {
      next();
    } else if (type === "create" && foundFeature.canCreate) {
      next();
    } else if (type === "update" && foundFeature.canUpdate) {
      next();
    } else if (type === "delete" && foundFeature.canDelete) {
      next();
    } else {
      return res.status(401).send({
        message: "This endpoint cannot be used yet",
        code: 401,
        success: false,
        date: Date.now(),
      });
    }
  };
};
