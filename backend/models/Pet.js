const mongoose = require("mongoose");

const petSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide a pet name"],
      trim: true,
    },
    type: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PetCategory",
      required: [true, "Please select a pet category"],
    },
    breed: {
      type: String,
      required: [true, "Please provide a breed"],
      trim: true,
    },
    age: {
      type: Number,
      required: [true, "Please provide age"],
      min: [0, "Age cannot be negative"],
    },
    gender: {
      type: String,
      enum: ["Male", "Female", "Unknown"],
      required: [true, "Please select a gender"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    status: {
      type: String,
      enum: ["available", "adopted", "rescue-needed"],
      default: "available",
    },
    location: {
      type: String,
      required: [true, "Please provide a location"],
      trim: true,
    },
    images: [
      {
        type: String,
        trim: true,
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Pet must be created by a user"],
    },
    shelterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shelter",
    },
    latitude: {
      type: Number,
    },
    longitude: {
      type: Number,
    },
    price: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Pet", petSchema);
