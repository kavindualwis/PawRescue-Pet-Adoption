const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const {
  createRequest,
  getMyRequests,
  getOwnerRequests,
  getOwnerPendingCount,
  updateRequestStatus,
  updateRequestMessage,
  cancelRequest,
  checkRequest,
} = require("../controllers/adoptionController");

router.use(protect); // All routes require auth

router.post("/", createRequest);                         // POST   /api/adoptions
router.get("/my-requests", getMyRequests);               // GET    /api/adoptions/my-requests
router.get("/owner-requests", getOwnerRequests);         // GET    /api/adoptions/owner-requests
router.get("/pending-count", getOwnerPendingCount);      // GET    /api/adoptions/pending-count
router.get("/check/:petId", checkRequest);               // GET    /api/adoptions/check/:petId
router.put("/:id/status", updateRequestStatus);          // PUT    /api/adoptions/:id/status
router.put("/:id", updateRequestMessage);              // PUT    /api/adoptions/:id
router.delete("/:id", cancelRequest);                    // DELETE /api/adoptions/:id

module.exports = router;
