const RescueCase = require("../models/RescueCase");
const Pet = require("../models/Pet");

// Report rescue case
exports.reportRescueCase = async (req, res) => {
  try {
    const { petId, title, animalType, description, location, latitude, longitude, images } = req.body;
    const reportedBy = req.user.id;

    if (!description || !location || !title || !animalType) {
      return res.status(400).json({
        success: false,
        message: "Please provide title, animalType, description, and location",
      });
    }

    const rescueCase = await RescueCase.create({
      petId: petId || null,
      title,
      animalType,
      reportedBy,
      description,
      location,
      latitude,
      longitude,
      images: images || [],
    });

    // Optionally update pet status to 'rescue-needed' if petId was provided
    if (petId) {
      await Pet.findByIdAndUpdate(petId, { status: "rescue-needed" });
    }

    await rescueCase.populate("petId");
    await rescueCase.populate("reportedBy", "name username email");

    res.status(201).json({
      success: true,
      data: rescueCase,
      message: "Rescue case reported successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get all rescue cases
exports.getRescueCases = async (req, res) => {
  try {
    const { status } = req.query;
    let filter = {};
    if (status) {
      filter.rescueStatus = status;
    }

    const cases = await RescueCase.find(filter)
      .populate("petId")
      .populate("reportedBy", "name username email")
      .populate("assignedTo", "name username email")
      .sort("-createdAt");

    res.status(200).json({
      success: true,
      data: cases,
      total: cases.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get rescue case by ID
exports.getRescueCaseById = async (req, res) => {
  try {
    const { id } = req.params;
    const rescueCase = await RescueCase.findById(id)
      .populate("petId")
      .populate("reportedBy", "name username email phoneNumber")
      .populate("assignedTo", "name username email phoneNumber");

    if (!rescueCase) {
      return res.status(404).json({
        success: false,
        message: "Rescue case not found",
      });
    }

    res.status(200).json({
      success: true,
      data: rescueCase,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update rescue case
exports.updateRescueCase = async (req, res) => {
  try {
    const { id } = req.params;
    const { rescueStatus, assignedTo, title, animalType, description, location, latitude, longitude, images, petId } = req.body;

    let rescueCase = await RescueCase.findById(id);

    if (!rescueCase) {
      return res.status(404).json({
        success: false,
        message: "Rescue case not found",
      });
    }

    const updateData = {};
    if (rescueStatus) updateData.rescueStatus = rescueStatus;
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo;
    if (title) updateData.title = title;
    if (animalType) updateData.animalType = animalType;
    if (description) updateData.description = description;
    if (location) updateData.location = location;
    if (latitude) updateData.latitude = latitude;
    if (longitude) updateData.longitude = longitude;
    if (images) updateData.images = images;
    if (petId !== undefined) updateData.petId = petId;

    rescueCase = await RescueCase.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate("petId")
      .populate("reportedBy", "name username email")
      .populate("assignedTo", "name username email");

    // If status is 'rescued' and there is a petId, maybe update pet status
    if (rescueStatus === "rescued" && rescueCase.petId) {
      await Pet.findByIdAndUpdate(rescueCase.petId, { status: "available" });
    }

    res.status(200).json({
      success: true,
      data: rescueCase,
      message: "Rescue case updated successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete rescue case
exports.deleteRescueCase = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const rescueCase = await RescueCase.findById(id);

    if (!rescueCase) {
      return res.status(404).json({
        success: false,
        message: "Rescue case not found",
      });
    }

    // Only reporter or admin can delete
    if (rescueCase.reportedBy.toString() !== userId && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this rescue case",
      });
    }

    await RescueCase.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Rescue case deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
