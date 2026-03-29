const mongoose = require("mongoose");

async function connectDB() {
  const isVercel = Boolean(process.env.VERCEL);
  const mongoUri = process.env.MONGO_URI || (!isVercel ? "mongodb://127.0.0.1:27017/acadalert" : "");

  if (!mongoUri) {
    throw new Error("MONGO_URI is missing. Set it in Vercel Project Settings -> Environment Variables.");
  }

  await mongoose.connect(mongoUri);
  // Keep output concise for local development visibility.
  console.log(`MongoDB connected: ${mongoose.connection.host}`);
}

module.exports = connectDB;
