const User = require('../models/user');

module.exports = async (req, res, next) => {
  try {
    req.user = await User.authenticate(req.headers['authorization']);
    next();
  }
  catch (err) {
    next(err);
  }
};