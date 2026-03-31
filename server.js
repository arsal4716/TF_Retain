require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const connectDB = require("./config/db");
const routes = require("./routes/routes");
const ringbaPixelRoutes = require("./routes/ringbaPixelRoutes");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

connectDB();

// API routes
app.use("/api", routes);
app.use("/api", ringbaPixelRoutes);

// React build folder
const buildPath = path.join(__dirname, "frontend", "build");

// serve static files
app.use(express.static(buildPath));

// React catch-all route
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(buildPath, "index.html"));
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});