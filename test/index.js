const mongoose = require('mongoose');
const chai = require('chai');
const expect = require('chai').expect;
const chaiHttp = require('chai-http');
const server = require('../index');
const User = require('../models/user');
const Consumable = require('../models/consumable');
const Subscription = require('../models/subscription');
const config = require('../config');
var request = null;
var user = null;

// User chai http
chai.use(chaiHttp);
// Wait for server to be ready and clear database
before(async function() {
	this.timeout(20000);
  await server.isReady;
	await mongoose.connection.db.dropDatabase();
  user = await User.register({email: "test@iaphub.com", password: "test"});
  request = chai.request(server.router).keepOpen();
});
// Disconnect database after tests done
after(function() {
  mongoose.disconnect();
});

it('Should purchase a consumable', async function() {
  this.timeout(5000);
  await request.post(`/iaphub/webhook`)
  .set('x-auth-token', config.IAPHUB_WEBHOOK_AUTH_TOKEN)
  .send({
    id:"5e7fdfe22a3cff5084466e78",
    type: 'purchase',
    createdDate:"2030-10-12T17:34:35.256Z",
    version: '1.2.0',
    data: {
      id: '5da20ea9fbd92641ae8d0c02',
      purchaseDate: '2030-10-12T17:34:33.256Z',
      quantity: 1,
      platform: 'android',
      country: 'IT',
      tags: {},
      orderId: 'GPA.2209-1028-4637-1551',
      app: '5d86507259e828b8fe321f7e',
      user: '5d865c10c41280ba7f0ce9c2',
      userId: user.id,
      product: '5d86507259e828b8fe321f8b',
      productSku: '10credits',
      productType: 'consumable',
      listing: '5d86507259e828b8fe321f32',
      store: '5d86507259e828b8fe321f84',
      currency: 'EUR',
      price: 9.99,
      convertedCurrency: 'USD',
      convertedPrice: 11.15,
      isSandbox: false,
      isRefunded: false,
      isSubscription: false
    }
  });

  var consumable = await Consumable.findOne({}).sort({createdDate: -1});

  expect(consumable.orderId).to.equal("GPA.2209-1028-4637-1551");
  expect(consumable.transactionId).to.equal("5da20ea9fbd92641ae8d0c02");
  expect(consumable.userId).to.equal(user.id);
  expect(consumable.productSku).to.equal("10credits");
  expect(consumable.isConsumed).to.equal(true);

  user = await User.findById(user.id);
  expect(user.credits).to.equal(10);
});

it('Should refund a consumable', async function() {
  this.timeout(5000);
  await request.post(`/iaphub/webhook`)
  .set('x-auth-token', config.IAPHUB_WEBHOOK_AUTH_TOKEN)
  .send({
    id:"5e7fdfe22a3cff5084466e79",
    type: 'refund',
    createdDate:"2030-10-12T17:34:35.256Z",
    version: '1.2.0',
    data: {
      id: '5da20ea9fbd92641ae8d0c02',
      purchaseDate: '2030-10-12T17:34:33.256Z',
      quantity: 1,
      platform: 'android',
      country: 'IT',
      tags: {},
      orderId: 'GPA.2209-1028-4637-1551',
      app: '5d86507259e828b8fe321f7e',
      user: '5d865c10c41280ba7f0ce9c2',
      userId: user.id,
      product: '5d86507259e828b8fe321f8b',
      productSku: '10credits',
      productType: 'consumable',
      listing: '5d86507259e828b8fe321f32',
      store: '5d86507259e828b8fe321f84',
      currency: 'EUR',
      price: 9.99,
      convertedCurrency: 'USD',
      convertedPrice: 11.15,
      isSandbox: false,
      isRefunded: true,
      refundAmount: 9.99,
      convertedRefundAmount: 11.15,
      isSubscription: false
    }
  });

  var consumable = await Consumable.findOne({orderId: "GPA.2209-1028-4637-1551"});
  expect(consumable.isRefunded).to.equal(true);
});

it('Should purchase a susbcription', async function() {
  this.timeout(5000);
  await request.post(`/iaphub/webhook`)
  .set('x-auth-token', config.IAPHUB_WEBHOOK_AUTH_TOKEN)
  .send({
    id:"5e7fdfe22a3cff5084466e75",
    type: 'purchase',
    version: '1.2.0',
    createdDate:"2030-10-12T17:34:35.256Z",
    data: {
      id: '5da20ea9fbd92641ae8d0c03',
      purchaseDate: '2030-10-12T17:34:33.256Z',
      quantity: 1,
      platform: 'ios',
      country: 'US',
      tags: {},
      orderId: '9873637705964380',
      app: '5d86507259e828b8fe321f7e',
      user: '5d865c10c41280ba7f0ce9c2',
      userId: user.id,
      product: '5d86507259e828b8fe321f8a',
      listing: '5d86507259e828b8fe321f32',
      store: '5d86507259e828b8fe321f85',
      currency: 'USD',
      price: 19.99,
      convertedCurrency: 'USD',
      convertedPrice: 19.99,
      isSandbox: false,
      isRefunded: false,
      isSubscription: true,
      isSubscriptionActive: true,
      isSubscriptionRenewable: true,
      isSubscriptionRetryPeriod: false,
      isTrialConversion: false,
      subscriptionState: 'active',
      subscriptionPeriodType: "normal",
      expirationDate: '2030-11-12T17:34:33.256Z',
      originalPurchase: '5da20ea9fbd92641ae8d0c03',
      productSku: 'membership_1',
      productType: 'renewable_subscription',
      productGroupName: 'subscription_group_1'
    }
  });

  var subscription = await Subscription.findOne({}).sort({createdDate: -1});

  expect(subscription.subscriptionId).to.equal("5da20ea9fbd92641ae8d0c03");
  expect(subscription.transactionId).to.equal("5da20ea9fbd92641ae8d0c03");
  expect(subscription.userId).to.equal(user.id);
  expect(subscription.productSku).to.equal("membership_1");
  expect(subscription.isRenewable).to.equal(true);
  expect(subscription.state).to.equal("active");
});

it('Should cancel subscription renewal', async function() {
  this.timeout(5000);
  await request.post(`/iaphub/webhook`)
  .set('x-auth-token', config.IAPHUB_WEBHOOK_AUTH_TOKEN)
  .send({
    id:"5e7fdfe22a3cff5084466e76",
    type: 'subscription_cancel',
    version: '1.2.0',
    createdDate:"2030-10-12T17:34:35.256Z",
    data: {
      id: '5da20ea9fbd92641ae8d0c03',
      purchaseDate: '2030-10-12T17:34:33.256Z',
      quantity: 1,
      platform: 'ios',
      country: 'US',
      tags: {},
      orderId: '9873637705964380',
      app: '5d86507259e828b8fe321f7e',
      user: '5d865c10c41280ba7f0ce9c2',
      userId: user.id,
      product: '5d86507259e828b8fe321f8a',
      listing: '5d86507259e828b8fe321f32',
      store: '5d86507259e828b8fe321f85',
      currency: 'USD',
      price: 19.99,
      convertedCurrency: 'USD',
      convertedPrice: 19.99,
      isSandbox: false,
      isRefunded: false,
      isSubscription: true,
      isSubscriptionActive: true,
      isSubscriptionRenewable: false,
      isSubscriptionRetryPeriod: false,
      isTrialConversion: false,
      subscriptionState: 'active',
      subscriptionPeriodType: "normal",
      expirationDate: '2030-11-12T17:34:33.256Z',
      originalPurchase: '5da20ea9fbd92641ae8d0c03',
      productSku: 'membership_1',
      productType: 'renewable_subscription',
      productGroupName: 'subscription_group_1'
    }
  });

  var subscription = await Subscription.findOne({subscriptionId: "5da20ea9fbd92641ae8d0c03"});
  expect(subscription.isRenewable).to.equal(false);
});

it('Should enter grace period', async function() {
  this.timeout(5000);
  await request.post(`/iaphub/webhook`)
  .set('x-auth-token', config.IAPHUB_WEBHOOK_AUTH_TOKEN)
  .send({
    id:"5e7fdfe22a3cff5084466e77",
    type: 'subscription_renewal_retry',
    version: '1.2.0',
    createdDate:"2030-10-12T17:34:35.256Z",
    data: {
      id: '5da20ea9fbd92641ae8d0c03',
      purchaseDate: '2030-10-12T17:34:33.256Z',
      quantity: 1,
      platform: 'ios',
      country: 'US',
      tags: {},
      orderId: '9873637705964380',
      app: '5d86507259e828b8fe321f7e',
      user: '5d865c10c41280ba7f0ce9c2',
      userId: user.id,
      product: '5d86507259e828b8fe321f8a',
      listing: '5d86507259e828b8fe321f32',
      store: '5d86507259e828b8fe321f85',
      currency: 'USD',
      price: 19.99,
      convertedCurrency: 'USD',
      convertedPrice: 19.99,
      isSandbox: false,
      isRefunded: false,
      isSubscription: true,
      isSubscriptionActive: true,
      isSubscriptionRenewable: false,
      isSubscriptionRetryPeriod: false,
      isTrialConversion: false,
      subscriptionState: 'grace_period',
      subscriptionPeriodType: "normal",
      expirationDate: '2030-11-12T17:34:33.256Z',
      originalPurchase: '5da20ea9fbd92641ae8d0c03',
      productSku: 'membership_1',
      productType: 'renewable_subscription',
      productGroupName: 'subscription_group_1'
    }
  });

  var subscription = await Subscription.findOne({subscriptionId: "5da20ea9fbd92641ae8d0c03"});
  expect(subscription.state).to.equal("grace_period");
});

it('Should replace subscription', async function() {
  this.timeout(5000);
  await request.post(`/iaphub/webhook`)
  .set('x-auth-token', config.IAPHUB_WEBHOOK_AUTH_TOKEN)
  .send({
    id:"5e7fdfe22a3cff5084466e88",
    type: 'subscription_replace',
    version: '1.2.0',
    createdDate:"2030-10-12T17:34:35.256Z",
    data: {
      id: '5da20ea9fbd92641ae8d0c04',
      purchaseDate: '2030-10-12T17:34:33.256Z',
      quantity: 1,
      platform: 'ios',
      country: 'US',
      tags: {},
      orderId: '9873637705964380',
      app: '5d86507259e828b8fe321f7e',
      user: '5d865c10c41280ba7f0ce9c2',
      userId: user.id,
      product: '5d86507259e828b8fe321f8a',
      listing: '5d86507259e828b8fe321f32',
      store: '5d86507259e828b8fe321f85',
      currency: 'USD',
      price: 29.99,
      convertedCurrency: 'USD',
      convertedPrice: 29.99,
      isSandbox: false,
      isRefunded: false,
      isSubscription: true,
      isSubscriptionActive: true,
      isSubscriptionRenewable: true,
      isSubscriptionRetryPeriod: false,
      isTrialConversion: false,
      subscriptionState: 'active',
      subscriptionPeriodType: "normal",
      expirationDate: '2030-11-12T17:34:33.256Z',
      linkedPurchase: '5da20ea9fbd92641ae8d0c03',
      originalPurchase: '5da20ea9fbd92641ae8d0c03',
      productSku: 'membership_2',
      productType: 'renewable_subscription',
      productGroupName: 'subscription_group_1'
    }
  });

  var subscription = await Subscription.findOne({subscriptionId: "5da20ea9fbd92641ae8d0c03"});
  expect(subscription.state).to.equal("active");
  expect(subscription.productSku).to.equal("membership_2");
  expect(subscription.isRenewable).to.equal(true);
});

it('Should update user id', async function() {
  this.timeout(5000);

  var newUser = await User.register({email: "test2@iaphub.com", password: "test"});

  await request.post(`/iaphub/webhook`)
  .set('x-auth-token', config.IAPHUB_WEBHOOK_AUTH_TOKEN)
  .send({
    id:"5e7fdfe22a3cff5084466e89",
    type: 'user_id_update',
    version: '1.2.0',
    createdDate:"2030-10-12T17:34:35.256Z",
    oldUserId: user.id,
    newUserId: newUser.id
  });

  var subscription = await Subscription.findOne({subscriptionId: "5da20ea9fbd92641ae8d0c03"});
  expect(subscription.userId).to.equal(newUser.id);
});

it('Should make the subscription expire', async function() {
  this.timeout(5000);
  await request.post(`/iaphub/webhook`)
  .set('x-auth-token', config.IAPHUB_WEBHOOK_AUTH_TOKEN)
  .send({
    id:"5e7fdfe22a3cff5084466e90",
    type: 'subscription_expire',
    version: '1.2.0',
    createdDate:"2030-10-12T17:34:35.256Z",
    data: {
      id: '5da20ea9fbd92641ae8d0c04',
      purchaseDate: '2030-10-12T17:34:33.256Z',
      quantity: 1,
      platform: 'ios',
      country: 'US',
      tags: {},
      orderId: '9873637705964380',
      app: '5d86507259e828b8fe321f7e',
      user: '5d865c10c41280ba7f0ce9c2',
      userId: user.id,
      product: '5d86507259e828b8fe321f8a',
      listing: '5d86507259e828b8fe321f32',
      store: '5d86507259e828b8fe321f85',
      currency: 'USD',
      price: 29.99,
      convertedCurrency: 'USD',
      convertedPrice: 29.99,
      isSandbox: false,
      isRefunded: false,
      isSubscription: true,
      isSubscriptionActive: false,
      isSubscriptionRenewable: false,
      isSubscriptionRetryPeriod: false,
      isTrialConversion: false,
      subscriptionState: 'expired',
      subscriptionPeriodType: "normal",
      expirationDate: '2030-11-12T17:34:33.256Z',
      linkedPurchase: '5da20ea9fbd92641ae8d0c03',
      originalPurchase: '5da20ea9fbd92641ae8d0c03',
      productSku: 'membership_2',
      productType: 'renewable_subscription',
      productGroupName: 'subscription_group_1'
    }
  });

  var subscription = await Subscription.findOne({subscriptionId: "5da20ea9fbd92641ae8d0c03"});
  expect(subscription.state).to.equal("expired");
  expect(subscription.isRenewable).to.equal(false);
});