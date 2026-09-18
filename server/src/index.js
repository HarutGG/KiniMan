const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
require("dotenv").config({ path: path.join(__dirname, "../.env") });
require("dotenv").config({ path: path.join(__dirname, "../../.env.local") });

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const { errorHandler, notFound } = require("./middleware/error");

const app = express();
const PORT = Number(process.env.PORT) || 4000;
const origin = process.env.CLIENT_ORIGIN || "http://localhost:3000";

app.use(
  cors({
    origin: origin.split(",").map((s) => s.trim()),
    credentials: true,
    methods: ["GET", "POST", "DELETE", "PUT", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Guest-Id"],
  }),
);
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "kinoman-api",
    mongo: mongoose.connection.readyState === 1,
  });
});

const router = express.Router();
require("./routes/quiz")(router);
require("./routes/movies")(router);
require("./routes/favorites")(router);
require("./routes/auth")(router);
app.use("/api", router);

app.use(notFound);
app.use(errorHandler);

async function start() {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/kinoman";
  try {
    await mongoose.connect(uri);
    console.log("MongoDB connected");
  } catch (err) {
    console.warn("MongoDB unavailable, quiz/search still work:", err.message);
  }
  app.listen(PORT, () => {
    console.log(`KinoMan API http://localhost:${PORT}`);
  });
}

start();
