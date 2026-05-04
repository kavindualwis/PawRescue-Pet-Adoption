const Shelter = require("../models/Shelter");
const Pet = require("../models/Pet");

// @desc    Create new shelter
// @route   POST /api/shelters
// @access  Private
exports.createShelter = async (req, res) => {
  try {
    req.body.createdBy = req.user.id;
    const shelter = await Shelter.create(req.body);
    res.status(201).json({ success: true, data: shelter });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Get all shelters
// @route   GET /api/shelters
// @access  Public
exports.getShelters = async (req, res) => {
  try {
    const shelters = await Shelter.find().populate("createdBy", "name username");
    res.status(200).json({ success: true, data: shelters });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Get single shelter
// @route   GET /api/shelters/:id
// @access  Public
exports.getShelter = async (req, res) => {
  try {
    const shelter = await Shelter.findById(req.params.id).populate("createdBy", "name username");
    if (!shelter) {
      return res.status(404).json({ success: false, message: "Shelter not found" });
    }
    
    // Also find pets belonging to this shelter
    const pets = await Pet.find({ shelterId: req.params.id }).populate("type");

    res.status(200).json({ success: true, data: shelter, pets });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Update shelter
// @route   PUT /api/shelters/:id
// @access  Private
exports.updateShelter = async (req, res) => {
  try {
    let shelter = await Shelter.findById(req.params.id);

    if (!shelter) {
      return res.status(404).json({ success: false, message: "Shelter not found" });
    }

    // Check ownership (only creator or admin can update)
    if (shelter.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ success: false, message: "Not authorized to update this shelter" });
    }

    shelter = await Shelter.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({ success: true, data: shelter });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete shelter
// @route   DELETE /api/shelters/:id
// @access  Private
exports.deleteShelter = async (req, res) => {
  try {
    const shelter = await Shelter.findById(req.params.id);

    if (!shelter) {
      return res.status(404).json({ success: false, message: "Shelter not found" });
    }

    // Check ownership
    if (shelter.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ success: false, message: "Not authorized to delete this shelter" });
    }

    // Unlink pets from this shelter (or delete them?) 
    // For now let's just unlink them.
    await Pet.updateMany({ shelterId: req.params.id }, { $unset: { shelterId: 1 } });

    await shelter.deleteOne();

    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
