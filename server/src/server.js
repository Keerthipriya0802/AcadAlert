require("dotenv").config();
const app = require("./app");
const connectDB = require("./config/db");
const seedData = require("./config/seed");

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await connectDB();
    await seedData();
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed", error);
    process.exit(1);
  }
}

startServer();
