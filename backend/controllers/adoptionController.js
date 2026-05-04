const AdoptionRequest = require("../models/AdoptionRequest");
const Pet = require("../models/Pet");

// ─── Create an adoption request ─────────────────────────────────────────────
exports.createRequest = async (req, res) => {
  try {
    const requesterId = req.user.id;
    const { petId, message } = req.body;

    if (!petId) {
      return res.status(400).json({ success: false, message: "petId is required" });
    }

    const pet = await Pet.findById(petId);
    if (!pet) {
      return res.status(404).json({ success: false, message: "Pet not found" });
    }

    if (pet.status === "adopted") {
      return res.status(400).json({ success: false, message: "This pet is already adopted" });
    }

    if (pet.createdBy.toString() === requesterId) {
      return res.status(400).json({ success: false, message: "You cannot adopt your own pet" });
    }

    // Check for existing pending/approved request
    const existing = await AdoptionRequest.findOne({ pet: petId, requester: requesterId });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "You already have a request for this pet",
        data: existing,
      });
    }

    const request = await AdoptionRequest.create({
      pet: petId,
      requester: requesterId,
      owner: pet.createdBy,
      message: message || "",
    });

    await request.populate("pet", "name images status");
    await request.populate("requester", "name username");

    res.status(201).json({ success: true, data: request, message: "Adoption request submitted" });
  } catch (error) {
    // Duplicate key (unique index on pet+requester)
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: "You already have a request for this pet" });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Get requests made BY the logged-in user ────────────────────────────────
exports.getMyRequests = async (req, res) => {
  try {
    const requesterId = req.user.id;
    const requests = await AdoptionRequest.find({ requester: requesterId })
      .populate("pet", "name images status breed")
      .populate("owner", "name username phoneNumber email")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: requests, total: requests.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Get requests received by the logged-in user (as pet owner) ─────────────
exports.getOwnerRequests = async (req, res) => {
  try {
    const ownerId = req.user.id;
    const requests = await AdoptionRequest.find({ owner: ownerId })
      .populate("pet", "name images status breed")
      .populate("requester", "name username phoneNumber email")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: requests, total: requests.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Get count of pending owner requests (for badge) ────────────────────────
exports.getOwnerPendingCount = async (req, res) => {
  try {
    const ownerId = req.user.id;
    const count = await AdoptionRequest.countDocuments({ owner: ownerId, status: "pending" });
    res.status(200).json({ success: true, count });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Approve or reject a request (owner action) ──────────────────────────────
exports.updateRequestStatus = async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { id } = req.params;
    const { status } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ success: false, message: "Status must be 'approved' or 'rejected'" });
    }

    const request = await AdoptionRequest.findById(id);
    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }

    if (request.owner.toString() !== ownerId) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    request.status = status;
    await request.save();

    // If approved → mark pet as adopted & reject other pending requests
    if (status === "approved") {
      await Pet.findByIdAndUpdate(request.pet, { status: "adopted" });

      // Reject all other pending requests for this pet
      await AdoptionRequest.updateMany(
        { pet: request.pet, _id: { $ne: request._id }, status: "pending" },
        { status: "rejected" }
      );
    }

    await request.populate("pet", "name images status");
    await request.populate("requester", "name username phoneNumber email");

    res.status(200).json({ success: true, data: request, message: `Request ${status}` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Cancel / delete a request (requester action) ────────────────────────────
exports.cancelRequest = async (req, res) => {
  try {
    const requesterId = req.user.id;
    const { id } = req.params;

    const request = await AdoptionRequest.findById(id);
    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }

    if (request.requester.toString() !== requesterId) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    if (request.status !== "pending") {
      return res.status(400).json({ success: false, message: "Only pending requests can be cancelled" });
    }

    await AdoptionRequest.findByIdAndDelete(id);

    res.status(200).json({ success: true, message: "Request cancelled successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Check if current user already requested a specific pet ─────────────────
exports.checkRequest = async (req, res) => {
  try {
    const requesterId = req.user.id;
    const { petId } = req.params;

    const request = await AdoptionRequest.findOne({ pet: petId, requester: requesterId });
    res.status(200).json({ success: true, data: request || null, exists: !!request });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Update request message (requester action) ──────────────────────────────
exports.updateRequestMessage = async (req, res) => {
  try {
    const requesterId = req.user.id;
    const { id } = req.params;
    const { message } = req.body;

    const request = await AdoptionRequest.findById(id);
    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }

    if (request.requester.toString() !== requesterId) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    if (request.status !== "pending") {
      return res.status(400).json({ success: false, message: "Only pending requests can be updated" });
    }

    request.message = message || "";
    await request.save();

    res.status(200).json({ success: true, data: request, message: "Request updated successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
