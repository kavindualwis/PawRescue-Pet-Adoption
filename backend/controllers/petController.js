const Pet = require("../models/Pet");
const PetCategory = require("../models/PetCategory");

exports.createPet = async (req, res) => {
  try {
    const { name, type, breed, age, gender, description, location, images, shelterId, latitude, longitude, price } = req.body;
    const userId = req.user.id;

    if (!name || !type || !breed || !age || !gender || !location) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    const category = await PetCategory.findById(type);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Pet category not found",
      });
    }

    const pet = await Pet.create({
      name,
      type,
      breed,
      age,
      gender,
      description: description || "",
      location,
      images: images || [],
      createdBy: userId,
      shelterId: shelterId || null,
      latitude: latitude || null,
      longitude: longitude || null,
      price: price || 0,
    });

    await pet.populate("type", "name");
    await pet.populate("createdBy", "name username");
    await pet.populate("shelterId");

    res.status(201).json({
      success: true,
      data: pet,
      message: "Pet created successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getAllPets = async (req, res) => {
  try {
    console.log("[petController] Fetching all pets. Query:", req.query);
    const { status, type, location } = req.query;

    let filter = {};

    if (status) {
      filter.status = status;
    }
    if (type) {
      filter.type = type;
    }
    if (location) {
      filter.location = { $regex: location, $options: "i" };
    }

    const pets = await Pet.find(filter)
      .populate("type", "name")
      .populate("createdBy", "name username email")
      .populate("shelterId");

    res.status(200).json({
      success: true,
      data: pets,
      total: pets.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getPetById = async (req, res) => {
  try {
    const { id } = req.params;

    const pet = await Pet.findById(id)
      .populate("type", "name")
      .populate("createdBy", "name username email phoneNumber")
      .populate("shelterId");

    if (!pet) {
      return res.status(404).json({
        success: false,
        message: "Pet not found",
      });
    }

    res.status(200).json({
      success: true,
      data: pet,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updatePet = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { name, type, breed, age, gender, description, status, location, images, shelterId, latitude, longitude, price } = req.body;

    let pet = await Pet.findById(id);

    if (!pet) {
      return res.status(404).json({
        success: false,
        message: "Pet not found",
      });
    }

    if (pet.createdBy.toString() !== userId && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this pet",
      });
    }

    if (type) {
      const category = await PetCategory.findById(type);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Pet category not found",
        });
      }
    }

    pet = await Pet.findByIdAndUpdate(
      id,
      {
        name: name || pet.name,
        type: type || pet.type,
        breed: breed || pet.breed,
        age: age !== undefined ? age : pet.age,
        gender: gender || pet.gender,
        description: description !== undefined ? description : pet.description,
        status: status || pet.status,
        location: location || pet.location,
        images: images !== undefined ? images : pet.images,
        shelterId: shelterId !== undefined ? shelterId : pet.shelterId,
        latitude: latitude !== undefined ? latitude : pet.latitude,
        longitude: longitude !== undefined ? longitude : pet.longitude,
        price: price !== undefined ? price : pet.price,
      },
      { new: true, runValidators: true }
    )
      .populate("type", "name")
      .populate("createdBy", "name username")
      .populate("shelterId");

    res.status(200).json({
      success: true,
      data: pet,
      message: "Pet updated successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.deletePet = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const pet = await Pet.findById(id);

    if (!pet) {
      return res.status(404).json({
        success: false,
        message: "Pet not found",
      });
    }

    if (pet.createdBy.toString() !== userId && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this pet",
      });
    }

    await Pet.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Pet deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getPetsByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const pets = await Pet.find({ createdBy: userId })
      .populate("type", "name")
      .populate("createdBy", "name username");

    res.status(200).json({
      success: true,
      data: pets,
      total: pets.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
