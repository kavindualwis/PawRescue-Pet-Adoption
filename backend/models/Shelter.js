const mongoose = require("mongoose");

const shelterSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide a shelter name"],
      trim: true,
    },
    location: {
      type: String,
      required: [true, "Please provide a location"],
      trim: true,
    },
    contactNumber: {
      type: String,
      required: [true, "Please provide a contact number"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Please provide an email"],
      trim: true,
      lowercase: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Shelter must be created by a user/admin"],
    },
    images: {
      type: [String],
      default: [],
    },
    type: {
      type: String,
      enum: ["shelter", "care-center"],
      default: "shelter",
    },
    latitude: {
      type: Number,
    },
    longitude: {
      type: Number,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Shelter", shelterSchema);
