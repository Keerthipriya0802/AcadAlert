require("dotenv").config();

const app = require("../src/app");
const connectDB = require("../src/config/db");
const seedData = require("../src/config/seed");

let initPromise;
let initError;

async function ensureInitialized() {
  if (!initPromise) {
    initPromise = (async () => {
      try {
        await connectDB();
        await seedData();
        initError = null;
      } catch (error) {
        initError = error;
        initPromise = null;
        throw error;
      }
    })();
  }

  return initPromise;
}

module.exports = async (req, res) => {
  try {
    await ensureInitialized();
    return app(req, res);
  } catch (error) {
    const reason = initError?.message || error?.message || "Unknown initialization error";
    console.error("Vercel function initialization failed", reason);
    return res.status(500).json({
      message: "Server initialization failed",
      reason,
    });
  }
};