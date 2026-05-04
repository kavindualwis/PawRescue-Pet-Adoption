const express = require("express");
const {
  getAllCategories,
  initializeCategories,
} = require("../controllers/categoryController");

const router = express.Router();

router.get("/", getAllCategories);
router.post("/initialize", initializeCategories);

module.exports = router;
