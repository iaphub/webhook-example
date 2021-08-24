const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SubscriptionSchema = new Schema({
  // Created date
  createdDate: {type: Date, default: Date.now},
  // Subscription id
  subscriptionId: {type: String, unique: true},
  // User id
  userId: {type: String, index: true},
  // Order id
  orderId: {type: String},
  // Transaction id
  transactionId: {type: String},
  // Product sku
  productSku: {type: String},
  // If the subscription will renewal automatically
  isRenewable: {type: Boolean},
  // State
  state: {type: String, enum: ['active', 'retry_period', 'grace_period', 'paused', 'expired']}
});

module.exports = mongoose.model('Subscription', SubscriptionSchema);