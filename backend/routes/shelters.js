const express = require("express");
const {
  createShelter,
  getShelters,
  getShelter,
  updateShelter,
  deleteShelter,
} = require("../controllers/shelterController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.route("/")
  .get(getShelters)
  .post(protect, createShelter);

router.route("/:id")
  .get(getShelter)
  .put(protect, updateShelter)
  .delete(protect, deleteShelter);

module.exports = router;
