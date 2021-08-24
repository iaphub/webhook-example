const crypto = require('crypto');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Subscription = require('./subscription');

const UserSchema = new Schema({
  // Created date
  createdDate: {type: Date, default: Date.now},
  // Email
  email: {type: String},
  // Password
  password: {type: String},
  // Auth token
  authToken: {type: String},
  // Credits
  credits: {type: Number, default: 0}
});

/*
 * ---------------------------- STATICS ----------------------------
 */

// Register new account
// Note: Do not copy/paste this function, it is very basic (and insecure) just for the example
UserSchema.statics.register = async function(opts = {}) {
  var user = await this.findOne({email: opts.email});

  if (user) {
    throw new Error("User email not available");
  }
  user = new this({
    email: opts.email,
    password: opts.password,
    authToken: crypto.randomBytes(64).toString('hex')
  });
  await user.save();
  return user;
};

// Login
// Note: Do not copy/paste this function, it is very basic (and insecure) just for the example
UserSchema.statics.login = async function(opts = {}) {
  var user = await this.findOne({email: opts.email});

  if (!user) {
    throw new Error("User email not found");
  }
  if (user.password != opts.password) {
    throw new Error("User password invalid");
  }
  return user;
};

// Authenticate user with token
UserSchema.statics.authenticate = async function(authToken) {
  var user = await this.findOne({authToken: authToken});

  if (!user) {
    throw new Error("User auth token invalid");
  }
  return user;
};


module.exports = mongoose.model('User', UserSchema);