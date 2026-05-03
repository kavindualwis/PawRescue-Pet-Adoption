const mongoose = require("mongoose");

const rescueCaseSchema = new mongoose.Schema(
  {
    petId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pet",
      // Removing required because it might be a new stray report
    },
    title: {
      type: String,
      required: [true, "Please provide a name/title for the report"],
    },
    animalType: {
      type: String,
      required: [true, "Please provide the animal type"],
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Please provide the reporter's user ID"],
    },
    description: {
      type: String,
      required: [true, "Please provide a description of the rescue case"],
      trim: true,
    },
    rescueStatus: {
      type: String,
      enum: ["pending", "in-progress", "rescued"],
      default: "pending",
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    location: {
      type: String,
      required: [true, "Please provide a location"],
    },
    latitude: {
      type: Number,
    },
    longitude: {
      type: Number,
    },
    images: [
      {
        type: String,
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("RescueCase", rescueCaseSchema);
