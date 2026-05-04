const Appointment = require("../models/Appointment");
const Pet = require("../models/Pet");

// Create appointment
exports.createAppointment = async (req, res) => {
  try {
    const requesterId = req.user.id;
    const { petId, appointmentDate, location } = req.body;

    if (!petId || !appointmentDate || !location) {
      return res.status(400).json({ success: false, message: "petId, appointmentDate, and location are required" });
    }

    const pet = await Pet.findById(petId);
    if (!pet) {
      return res.status(404).json({ success: false, message: "Pet not found" });
    }

    if (pet.createdBy.toString() === requesterId) {
      return res.status(400).json({ success: false, message: "You cannot book an appointment for your own pet" });
    }

    const appointment = await Appointment.create({
      petId,
      requesterId,
      ownerId: pet.createdBy,
      appointmentDate,
      location,
      status: "pending",
    });

    await appointment.populate("petId", "name images status");
    await appointment.populate("requesterId", "name username");
    await appointment.populate("ownerId", "name username");

    res.status(201).json({ success: true, data: appointment, message: "Appointment booked successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get appointments for the logged-in user (either as requester or owner)
exports.getMyAppointments = async (req, res) => {
  try {
    const userId = req.user.id;
    // Get both appointments where user is requester OR owner
    const appointments = await Appointment.find({
      $or: [{ requesterId: userId }, { ownerId: userId }],
    })
      .populate("petId", "name images status breed")
      .populate("requesterId", "name username phoneNumber email")
      .populate("ownerId", "name username phoneNumber email")
      .sort({ appointmentDate: 1 });

    res.status(200).json({ success: true, data: appointments, total: appointments.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update appointment (schedule or status)
exports.updateAppointment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { appointmentDate, location, status } = req.body;

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({ success: false, message: "Appointment not found" });
    }

    // Check if user is requester or owner
    const isRequester = appointment.requesterId.toString() === userId;
    const isOwner = appointment.ownerId.toString() === userId;

    if (!isRequester && !isOwner) {
      return res.status(403).json({ success: false, message: "Not authorized to update this appointment" });
    }

    // Only owner can confirm or complete
    if (status && ["confirmed", "completed"].includes(status) && !isOwner) {
      return res.status(403).json({ success: false, message: "Only the owner can confirm or complete an appointment" });
    }

    // Update fields if provided
    if (appointmentDate) appointment.appointmentDate = appointmentDate;
    if (location) appointment.location = location;
    if (status) appointment.status = status;

    await appointment.save();

    await appointment.populate("petId", "name images status");
    await appointment.populate("requesterId", "name username");
    await appointment.populate("ownerId", "name username");

    res.status(200).json({ success: true, data: appointment, message: "Appointment updated successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Cancel appointment
exports.cancelAppointment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({ success: false, message: "Appointment not found" });
    }

    if (appointment.requesterId.toString() !== userId && appointment.ownerId.toString() !== userId) {
      return res.status(403).json({ success: false, message: "Not authorized to cancel this appointment" });
    }

    appointment.status = "cancelled";
    await appointment.save();

    res.status(200).json({ success: true, message: "Appointment cancelled successfully", data: appointment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete appointment
exports.deleteAppointment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({ success: false, message: "Appointment not found" });
    }

    if (appointment.requesterId.toString() !== userId) {
      return res.status(403).json({ success: false, message: "Only the requester can delete this request" });
    }

    await appointment.deleteOne();

    res.status(200).json({ success: true, message: "Appointment deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
