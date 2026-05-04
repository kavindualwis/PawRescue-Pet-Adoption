const mongoose = require("mongoose");

const CampaignSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Please provide a title"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Please provide a description"],
    },
    targetAmount: {
      type: Number,
      required: [true, "Please provide a target amount"],
    },
    collectedAmount: {
      type: Number,
      default: 0,
    },
    petId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pet",
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "active", "closed", "rejected"],
      default: "pending",
    },
    animalType: {
        type: String,
        default: "Other"
    },
    category: {
        type: String,
        enum: ["Medical", "Rescue", "Shelter", "Food", "Other"],
        default: "Other"
    },
    verificationDocuments: [{
      type: String, // URLs to images/PDFs
    }],
    verificationNotes: {
      type: String,
    },
    images: [{
      type: String,
    }],
    orgPhoneNumber: {
      type: String,
    },
    currency: {
      type: String,
      default: "LKR",
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Campaign", CampaignSchema);
