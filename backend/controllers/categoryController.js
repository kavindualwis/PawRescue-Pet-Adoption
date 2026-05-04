const PetCategory = require("../models/PetCategory");

exports.getAllCategories = async (req, res) => {
  try {
    const categories = await PetCategory.find().sort({ name: 1 });

    res.status(200).json({
      success: true,
      data: categories,
      total: categories.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.initializeCategories = async (req, res) => {
  try {
    const defaultCategories = [
      { name: "Dog", description: "Dogs and related breeds" },
      { name: "Cat", description: "Cats and related breeds" },
      { name: "Bird", description: "Birds of all kinds" },
      { name: "Rabbit", description: "Rabbits and bunnies" },
      { name: "Hamster", description: "Hamsters and small rodents" },
      { name: "Guinea Pig", description: "Guinea pigs" },
      { name: "Horse", description: "Horses and equines" },
      { name: "Fish", description: "Fish and aquatic pets" },
      { name: "Reptile", description: "Reptiles and similar pets" },
      { name: "Other", description: "Other pet types" },
    ];

    const existingCount = await PetCategory.countDocuments();

    if (existingCount > 0) {
      return res.status(200).json({
        success: true,
        message: "Categories already initialized",
        data: await PetCategory.find(),
      });
    }

    const categories = await PetCategory.insertMany(defaultCategories);

    res.status(201).json({
      success: true,
      data: categories,
      message: "Categories initialized successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
