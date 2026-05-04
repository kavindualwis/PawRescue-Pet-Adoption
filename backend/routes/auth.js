const express = require("express");
const {
  register,
  login,
  checkUsername,
  getMe,
  toggleFavorite,
  getFavorites,
  updateProfile,
} = require("../controllers/authController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/check-username", checkUsername);
router.get("/me", protect, getMe);
router.post("/favorites/toggle", protect, toggleFavorite);
router.get("/favorites", protect, getFavorites);
router.put("/profile", protect, updateProfile);

module.exports = router;
