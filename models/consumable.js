const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ConsumableSchema = new Schema({
  // Created date
  createdDate: {type: Date, default: Date.now},
  // Order id
  orderId: {type: String, unique: true},
  // User id
  userId: {type: String, index: true},
  // Transaction id
  transactionId: {type: String},
  // Product sku
  productSku: {type: String},
  // If the consumable has been consumed (only necessary when allowing anonymous purchases)
  isConsumed: {type: Boolean},
  // If the consumable has been refunded
  isRefunded: {type: Boolean}
});

/*
 * ---------------------------- METHODS ----------------------------
 */

// Return the number of credits a consumable is giving
ConsumableSchema.methods.getCredits = function() {
  if (this.productSku.indexOf('10credits') != -1) {
    return 10;
  }
  else if (this.productSku.indexOf('20credits') != -1) {
    return 20;
  }
  return 0;
};

module.exports = mongoose.model('Consumable', ConsumableSchema);