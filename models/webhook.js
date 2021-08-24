const got = require('got');
const mongoose = require('mongoose');
const config = require('../config');
const Schema = mongoose.Schema;
const Mixed = mongoose.SchemaTypes.Mixed;

const Subscription    = require('../models/subscription');
const Consumable      = require('../models/consumable');
const User            = require('../models/user');

const WebhookSchema = new Schema({
  // Created date
  createdDate: {type: Date, default: Date.now},
  // Webhook id
  webhookId: {type: String, unique: true},
  // Type
  type: {type: String},
  // Data
  data: {type: Mixed},
  // Status
  status: {type: String, enum: ['new', 'success', 'failed'], default: 'new'}
});

/*
 * ---------------------------- METHODS ----------------------------
 */

// Process a webhook
WebhookSchema.methods.process = async function() {
  try {
    // This webhook is related to the user, it happens when a user restore its purchases with a different user id
    if (this.type == 'user_id_update') {
      await this.updateUserId();
    }
    // All other webhooks related to transactions
    else {
      // Handle subscriptions
      if (['subscription', 'renewable_subscription'].indexOf(this.data.productType) != -1) {
        await this.updateSubscription();
      }
      // Handle consumables
      else if (this.data.productType == 'consumable') {
        await this.updateConsumable();
      }
    }
    // Update the status to success
    this.status = 'success';
    await this.save();
  }
  // If an error is thrown update the status to failed
  catch (err) {
    console.log("Webhook process failed: ", err);
    this.status = 'failed';
    await this.save();
  }
};

// Update user id
WebhookSchema.methods.updateUserId = async function() {
  // Get the latest user migrate data
  var data = (process.env.NODE_ENV == 'testing') ? {userId: this.data.newUserId} : await got({
    method: 'GET',
    url: `https://api.iaphub.com/v1/app/${config.IAPHUB_APP_ID}/user/${this.data.oldUserId}/migrate`,
    headers: {
      'Authorization': `ApiKey ${config.IAPHUB_API_KEY}`
    }
  });
  // Check for errors
  if (data.error) {
    throw new Error(`IAPHUB API call failed with error ${data.error}`);
  }
  // Check that the new user id exists
  var oldUserId = this.data.oldUserId;
  var newUserId = data.userId;
  var newUser = await User.findById(newUserId);
  if (!newUser) {
    throw new Error(`New user id of update_user_id not found`);
  }
  // Migrate active subscriptions to the new user id
  await Subscription.updateMany(
    {userId: oldUserId, state: {$ne: 'expired'}},
    {userId: newUserId}
  );

  /*
   * 👇 The code below is only necessary if you're allowing anonymous purchases (Only available in IAPHUB v7)
   */

  // If an anonymous user id is now 'authenticated'
  // We need to check if we have non-consumed consumables
  if (oldUserId.indexOf('a:') == 0) {
    var consumables = await Consumable.find({userId: oldUserId, isConsumed: false}).cursor();

    await consumables.eachAsync(async (consumable) => {
      // Give consumable if not refunded
      if (!consumable.isRefunded) {
        newUser.credits += consumable.getCredits();
        await newUser.save();
      }
      // Consume and update user id
      consumable.isConsumed = true;
      consumable.userId = newUser.id;
      await consumable.save();
    });
  }
};

// Update subscription
WebhookSchema.methods.updateSubscription = async function() {
  // Get the latest subscription data
  var data = (process.env.NODE_ENV == 'testing') ? this.data : await got({
    method: 'GET',
    url: `https://api.iaphub.com/v1/app/${config.IAPHUB_APP_ID}/subscription/${this.data.originalPurchase}`,
    headers: {
      'Authorization': `ApiKey ${config.IAPHUB_API_KEY}`
    }
  });
  // Check for errors
  if (data.error) {
    throw new Error(`IAPHUB API call failed with error ${data.error}`);
  }
  // Find subscription
  var subscription = await Subscription.findOne({subscriptionId: data.originalPurchase});
  // Handle new subscription
  if (!subscription) {
    // Create subscription
    subscription = new Subscription({
      subscriptionId: data.originalPurchase, // You should have a unique index on 'subscriptionId'
      userId: data.userId,
      transactionId: data.id,
      productSku: data.productSku,
      isRenewable: data.isSubscriptionRenewable,
      state: data.subscriptionState
    });
  }
  // Handle subscription change
  else {
    // Check if the subscription state has changed
    if (data.subscriptionState != subscription.state) {
      if (data.subscriptionState == 'grace_period') {
        // It means the subscription couldn't be renewed but is still active during the grace period
        // You could contact the user to ask him to update its payment informations
      }
      else if (data.subscriptionState == 'retry_period') {
        // It means the subscription couldn't be renewed and is inactive but it's still trying to renew
        // You could contact the user to ask him to update its payment informations
      }
      subscription.state = data.subscriptionState;
    }
    // Check if the subscription renewable status has changed
    if (data.isSubscriptionRenewable != subscription.isRenewable) {
      subscription.isRenewable = data.isSubscriptionRenewable;
    }
    // Check if the order id has changed (will happen on a subscription renewal/replace)
    if (data.orderId != subscription.orderId) {
      subscription.orderId = data.orderId;
    }
    // Check if the order id has changed (will happen on a subscription renewal/replace)
    if (data.transactionId != subscription.transactionId) {
      subscription.transactionId = data.transactionId;
    }
    // Check if the product sku has changed (will happen on a subscription replace)
    if (data.productSku != subscription.productSku) {
      subscription.productSku = data.productSku;
    }
  }
  // Save subscription
  await subscription.save();
};

// Update consumable
WebhookSchema.methods.updateConsumable = async function() {
  // Get the latest purchase data
  var data = (process.env.NODE_ENV == 'testing') ? this.data : await got({
    method: 'GET',
    url: `https://api.iaphub.com/v1/app/${config.IAPHUB_APP_ID}/purchase/${this.data.id}`,
    headers: {
      'Authorization': `ApiKey ${config.IAPHUB_API_KEY}`
    }
  });
  // Check for errors
  if (data.error) {
    throw new Error(`IAPHUB API call failed with error ${data.error}`);
  }
  // Find consumable
  var consumable = await Consumable.findOne({orderId: data.orderId});
  // Handle new consumable
  if (this.type == 'purchase') {
    // Do not do anything if the consumable already exists
    if (consumable) return;
    // Create consumable
    var consumable = new Consumable({
      orderId: this.data.orderId, // You should have a unique index on 'orderId'
      userId: this.data.userId,
      transactionId: this.data.id,
      productSku: this.data.productSku,
      isConsumed: true
    });
    var user = await User.findOne({_id: this.data.userId});

    // Marking the consumable as 'non-consumed' is only necessary when allowing anonymous purchases (purchases without being logged in) (only available in IAPHUB v7)
    // The user won't be found (since it'll be an anonymous user id), we need to mark the consumable to add the credits later when the user will be logged in
    if (!user) {
      consumable.isConsumed = false;
    }
    else {
      user.credits += consumable.getCredits();
      await user.save();
    }
    await consumable.save();
  }
  // Handle consumable refund (you could do something if you detect users abusing from refunds)
  else if (this.type == 'refund') {
    var consumable = await Consumable.findOne({orderId: this.data.orderId});
    // Mark consumable as refunded
    if (consumable) {
      consumable.isRefunded = true;
      await consumable.save();
    }
  }
};

module.exports = mongoose.model('Webhook', WebhookSchema);