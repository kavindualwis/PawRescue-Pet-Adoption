const express = require("express");
const {
  reportRescueCase,
  getRescueCases,
  getRescueCaseById,
  updateRescueCase,
  deleteRescueCase,
} = require("../controllers/rescueController");
const { protect } = require("../middleware/auth");
const {
  uploadImages,
  convertImagesToBase64,
} = require("../utils/imageUpload");

const router = express.Router();

router.get("/", getRescueCases);
router.get("/:id", getRescueCaseById);

router.post("/", protect, uploadImages, convertImagesToBase64, reportRescueCase);
router.put("/:id", protect, uploadImages, convertImagesToBase64, updateRescueCase);
router.delete("/:id", protect, deleteRescueCase);

module.exports = router;
