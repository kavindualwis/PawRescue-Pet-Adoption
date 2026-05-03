const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const mongoose = require("mongoose");

// Load env vars
dotenv.config(); // Load environment variables

// Connect to database
mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/pawrescue")
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log("MongoDB connection error:", err));

const app = express();

// Middleware
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json({ limit: "50mb" }));

// Request logging middleware (without sensitive data)
app.use((req, res, next) => {
  const logBody = { ...req.body };
  // Remove sensitive / large fields from logs
  delete logBody.password;
  delete logBody.passwordConfirm;
  delete logBody.images; // don't log base64 image data
  
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  if (req.headers.authorization) {
    console.log("Auth Header present:", req.headers.authorization.substring(0, 20) + "...");
  }
  if (Object.keys(logBody).length > 0) {
    console.log("Body:", logBody);
  }
  next();
});

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/pets", require("./routes/pets"));
app.use("/api/categories", require("./routes/categories"));
app.use("/api/adoptions", require("./routes/adoptions"));
app.use("/api/appointments", require("./routes/appointments"));
app.use("/api/shelters", require("./routes/shelters"));
app.use("/api/rescues", require("./routes/rescueRoutes"));
app.use("/api/campaigns", require("./routes/campaignRoutes"));
app.use("/api/payments", require("./routes/paymentRoutes"));

// Basic route
app.get("/", (req, res) => {
  res.json({ message: "Welcome to PawRescue API" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("[ERROR]", err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Server error",
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
