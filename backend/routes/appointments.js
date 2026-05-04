const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const {
  createAppointment,
  getMyAppointments,
  updateAppointment,
  cancelAppointment,
  deleteAppointment,
} = require("../controllers/appointmentController");

router.use(protect); // All routes require auth

router.post("/", createAppointment);               // POST   /api/appointments
router.get("/", getMyAppointments);                // GET    /api/appointments
router.put("/:id", updateAppointment);            // PUT    /api/appointments/:id
router.delete("/:id", cancelAppointment);          // DELETE /api/appointments/:id
router.delete("/:id/delete", deleteAppointment);   // DELETE /api/appointments/:id/delete

module.exports = router;
