require("dotenv").config();

const app = require("../src/app");
const connectDB = require("../src/config/db");
const seedData = require("../src/config/seed");

let initPromise;

async function ensureInitialized() {
  if (!initPromise) {
    initPromise = (async () => {
      await connectDB();
      await seedData();
    })();
  }

  return initPromise;
}

module.exports = async (req, res) => {
  try {
    await ensureInitialized();
    return app(req, res);
  } catch (error) {
    console.error("Vercel function initialization failed", error);
    return res.status(500).json({ message: "Server initialization failed" });
  }
};