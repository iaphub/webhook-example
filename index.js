const mongoose        = require('mongoose');
const express         = require('express');
const bodyParser      = require('body-parser');
const User            = require('./models/user');
const Webhook         = require('./models/webhook');
const authMiddleware  = require('./middlewares/auth');
const config          = require('./config');
const app             = express();

const promisify = (callback) => {
  return (req, res, next) => {
    Promise.resolve()
    .then(() => callback(req, res))
    .then(() => {
      next();
    })
    .catch((err) => {
      next(err);
    });
  };
};

// Add express middlewares
app.use(bodyParser.json({}));
app.use(bodyParser.urlencoded({extended: true}));

// Route where IAPHUB will post webhooks
app.post('/iaphub/webhook', promisify(async (req, res) => {
  // Ignore the webhook if the auth token is invalid
  if (req.headers['x-auth-token'] != config.IAPHUB_WEBHOOK_AUTH_TOKEN) {
    return res.end();
  }
  // Check that the webhook doesn't exist already to avoid duplicates (shouldn't happen but let's be safe)
  // You should also create an unique index on 'webhookId'
  var webhook = await Webhook.findOne({webhookId: req.body.id});
  if (webhook) {
    return res.end();
  }
  // Create webhook
  var webhook = new Webhook({
    createdDate: req.body.createdDate,
    webhookId: req.body.id,
    type: req.body.type,
    data: req.body.data
  });
  // The format of the 'user_id_update' webhook is a bit different
  if (req.body.type == 'user_id_update') {
    webhook.data = {oldUserId: req.body.oldUserId, newUserId: req.body.newUserId};
  }
  // Save webhook (if it fails, the server will return an error 500 and the IAPHUB server will retry later)
  await webhook.save();
  // Process webhook
  try {
    await webhook.process();
  }
  catch (err) {
    // The webhook has been saved with a 'failed' status, you can retry it from your server if needed
    // Note: You can use your logging system here to be alerted when there is an error
  }
  res.end();
}));

// Route to register a new user
app.post('/register', promisify(async (req, res) => {
  var response = {};

  try {
    await User.register(req.body);
  }
  catch (err) {
    response.error = true;
  }
  res.json(response);
}));

// Route to log in a user
app.post('/login', promisify(async (req, res) => {
  var response = {};

  try {
    await User.login(req.body);
  }
  catch (err) {
    response.error = true;
  }
  res.json(response);
}));

// Route returning the logged user
app.get('/user', authMiddleware, promisify(async (req, res) => {
  const subscription = await Subscription.findOne({userId: req.user.id});
  
  // Very simple here, we're just returning the user subscripton state and credits
  res.json({
    subscriptionState: subscription ? subscription.state : 'inactive',
    credits: req.user.credits
  });
}));

// Function to start server
const startServer = async () => {
  // Connect DB
  await mongoose.connect(config.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
    useCreateIndex: true
  });
  mongoose.set('bufferCommands', false);
  // Start server (if not running testing)
  if (process.env.NODE_ENV != 'testing') {
    app.listen(config.PORT);
    console.log(`Server listenning on port ${config.PORT}`);
  }
};

module.exports.router = app;

module.exports.isReady = new Promise(async (resolve) => {
  await startServer();
  resolve();
});