const express = require("express");
const {
  createPet,
  getAllPets,
  getPetById,
  updatePet,
  deletePet,
  getPetsByUser,
} = require("../controllers/petController");
const { protect } = require("../middleware/auth");
const {
  uploadImages,
  convertImagesToBase64,
} = require("../utils/imageUpload");

const router = express.Router();

router.post("/", protect, uploadImages, convertImagesToBase64, createPet);
router.get("/", getAllPets);
router.get("/user/:userId", getPetsByUser);
router.get("/:id", getPetById);
router.put("/:id", protect, uploadImages, convertImagesToBase64, updatePet);
router.delete("/:id", protect, deletePet);

module.exports = router;
