const express = require("express");
const router = express.Router();
const {
  createCampaign,
  getCampaigns,
  getCampaignById,
  verifyCampaign,
  updateProgress,
  deleteCampaign,
  updateCampaign,
} = require("../controllers/campaignController");
const { protect, admin, optionalProtect } = require("../middleware/auth");

router.route("/")
  .post(protect, createCampaign)
  .get(optionalProtect, getCampaigns);

router.route("/:id")
  .get(getCampaignById)
  .put(protect, updateCampaign)
  .delete(protect, deleteCampaign);

router.put("/:id/verify", protect, admin, verifyCampaign);
router.put("/:id/progress", protect, updateProgress);

module.exports = router;
