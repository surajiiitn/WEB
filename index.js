require("dotenv").config();
const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const ejsMate = require("ejs-mate");
const ExpressError = require("./Utils/ExpressError");
const wrapAsync = require("./Utils/wrapAsync");
const rateLimiter = require("./rateLimiter");

const userController = require("./controllers/userController");
const teamController = require("./controllers/teamController");

const app = express();

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ Connected to database"))
  .catch((err) => console.log("❌ DB Error:", err));

app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Routes
app.get("/", userController.renderHome);
``
// User registration with rate limiting
app.post("/listings", rateLimiter, wrapAsync(userController.sendUserOtp));
app.post("/listings/submit-otp", rateLimiter, wrapAsync(userController.verifyUserOtp));

// Team routes with rate limiting
app.get("/team/register", teamController.renderTeamRegister);
app.post("/register/team", rateLimiter, wrapAsync(teamController.handleTeamRegistration));
app.post("/team/verify-otp", rateLimiter, wrapAsync(teamController.verifyTeamOtp));

// Error handling
app.all("*", (req, res, next) => {
  next(new ExpressError(404, "Page Not Found"));
});

app.use((err, req, res, next) => {
  const { statusCode = 500 } = err;
  res.status(statusCode).render("listings/error", { err, hideNavbar: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
