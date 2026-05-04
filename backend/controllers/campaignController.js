const Campaign = require("../models/Campaign");
const Pet = require("../models/Pet");

// Create Campaign
exports.createCampaign = async (req, res) => {
  try {
    const { 
        title, 
        description, 
        targetAmount, 
        petId, 
        animalType, 
        category,
        orgPhoneNumber,
        verificationDocuments,
        images 
    } = req.body;
    
    const createdBy = req.user.id;

    if (!title || !description || !targetAmount) {
      return res.status(400).json({
        success: false,
        message: "Please provide title, description, and target amount",
      });
    }

    const campaign = await Campaign.create({
      title,
      description,
      targetAmount,
      petId: petId || null,
      animalType,
      category,
      orgPhoneNumber,
      createdBy,
      verificationDocuments: verificationDocuments || [],
      images: images || [],
      status: "pending", // Always starts as pending for admin verification
    });

    res.status(201).json({
      success: true,
      data: campaign,
      message: "Campaign submitted for verification",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get all Campaigns
exports.getCampaigns = async (req, res) => {
  try {
    const { status, category, petId } = req.query;
    let filter = {};
    
    // Visibility logic:
    // 1. Admins see everything (or filtered by status if provided)
    // 2. Logged in users see "active" + their own "pending/rejected"
    // 3. Guests see only "active"
    
    const mongoose = require("mongoose");
    
    if (req.user && req.user.role === "admin") {
        console.log("[getCampaigns] Admin detected, showing all");
        if (status) filter.status = status;
    } else if (req.user) {
        console.log("[getCampaigns] User detected:", req.user.id);
        const userId = new mongoose.Types.ObjectId(req.user.id);
        // Show active campaigns OR campaigns created by this user
        filter = {
            ...filter,
            $or: [
                { status: "active" },
                { createdBy: userId }
            ]
        };
        // If specific status requested (e.g. user wants to see only their pending)
        if (status) {
            filter.status = status;
            // Ensure they can't see other's pending by requesting it
            filter.createdBy = userId;
        }
    } else {
        console.log("[getCampaigns] Guest detected, showing only active");
        filter.status = "active";
    }

    console.log("[getCampaigns] Final Filter:", JSON.stringify(filter));

    if (category) filter.category = category;
    if (petId) filter.petId = petId;

    const campaigns = await Campaign.find(filter)
      .populate("petId")
      .populate("createdBy", "name username email phoneNumber")
      .sort("-createdAt");

    res.status(200).json({
      success: true,
      data: campaigns,
      total: campaigns.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get Campaign by ID
exports.getCampaignById = async (req, res) => {
  try {
    const { id } = req.params;
    const campaign = await Campaign.findById(id)
      .populate("petId")
      .populate("createdBy", "name username email phoneNumber");

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found",
      });
    }

    res.status(200).json({
      success: true,
      data: campaign,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update Campaign (Admin Only - Verification)
exports.verifyCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, verificationNotes } = req.body;

    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to verify campaigns",
      });
    }

    const campaign = await Campaign.findByIdAndUpdate(
      id,
      { status, verificationNotes },
      { new: true, runValidators: true }
    );

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found",
      });
    }

    res.status(200).json({
      success: true,
      data: campaign,
      message: `Campaign status updated to ${status}`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update Campaign (Creator Only)
exports.updateCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, targetAmount, petId, animalType, category, orgPhoneNumber, images } = req.body;

    let campaign = await Campaign.findById(id);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found",
      });
    }

    // Only creator or admin can update
    if (campaign.createdBy.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this campaign",
      });
    }

    const updateData = {};
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (targetAmount) updateData.targetAmount = targetAmount;
    if (petId !== undefined) updateData.petId = petId;
    if (animalType) updateData.animalType = animalType;
    if (category) updateData.category = category;
    if (orgPhoneNumber) updateData.orgPhoneNumber = orgPhoneNumber;
    if (images) updateData.images = images;

    campaign = await Campaign.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate("petId")
      .populate("createdBy", "name username email phoneNumber");

    res.status(200).json({
      success: true,
      data: campaign,
      message: "Campaign updated successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update Progress (Donation)
exports.updateProgress = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid donation amount",
      });
    }

    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found",
      });
    }

    campaign.collectedAmount += amount;
    
    // Auto-close if target reached? Maybe not, keep it manual for now
    // if (campaign.collectedAmount >= campaign.targetAmount) campaign.status = "closed";

    await campaign.save();

    res.status(200).json({
      success: true,
      data: campaign,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete Campaign
exports.deleteCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const campaign = await Campaign.findById(id);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found",
      });
    }

    // Only creator or admin can delete
    if (campaign.createdBy.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this campaign",
      });
    }

    await Campaign.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Campaign deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
