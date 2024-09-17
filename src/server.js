const express = require("express");
const cors = require("cors");
const portfinder = require("portfinder");
const dotenv = require("dotenv");
const path = require("path");
const rootRouter = require("./routes/index");
const { errorHandler } = require("./middleware/errors");
const fs = require("fs");

dotenv.config();

// Create Express application
const app = express();

// Middleware setup
app.use(cors());
app.use(express.json());

// API routes
app.use("/api", rootRouter);

// Resolve path for static files
const distPath = path.join(process.cwd(), "/src/dist");
app.use(express.static(distPath));
app.get("*", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

// Error handling middleware
app.use(errorHandler);

// Function to start the server
const startServer = async () => {
  try {
    // Find an available port
    const port = await portfinder.getPortPromise({
      port: parseInt(process.env.PORT || "8000", 10),
    });

    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  } catch (error) {
    console.error("Error starting the server:", error);
  }
};

// Start the server
startServer();
