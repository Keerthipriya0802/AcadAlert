const mongoose = require("mongoose");

async function connectDB() {
  const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/acadalert";
  await mongoose.connect(mongoUri);
  // Keep output concise for local development visibility.
  console.log(`MongoDB connected: ${mongoose.connection.host}`);
}

module.exports = connectDB;
