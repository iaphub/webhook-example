module.exports = {
  PORT: process.env.PORT || 3000, 
  MONGO_URL: process.env.MONGO_URL || "mongodb://localhost:27017,localhost:27018,localhost:27019/iaphub-webhook-example?replicaSet=rs&retryWrites=true&w=majority",
  IAPHUB_WEBHOOK_AUTH_TOKEN: process.env.IAPHUB_WEBHOOK_AUTH_TOKEN || "fakeauthtoken",
  IAPHUB_APP_ID: process.env.IAPHUB_APP_ID,
  IAPHUB_API_KEY: process.env.IAPHUB_API_KEY
};