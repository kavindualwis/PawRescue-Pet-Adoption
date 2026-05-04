const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "7d",
  });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { name, username, email, phoneNumber, password, role, secretKey } = req.body;

    console.log("[Register] Received registration request:", { name, username, email, phoneNumber, role });

    // Validation
    if (!name || !username || !email || !phoneNumber || !password) {
      console.log("[Register] Missing required fields");
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    // Role validation
    let assignedRole = "user";
    if (role === "admin") {
      if (secretKey !== process.env.ADMIN_SECRET) {
        return res.status(403).json({
          success: false,
          message: "Invalid secret key for admin registration",
        });
      }
      assignedRole = "admin";
    }

    // Check if user already exists
    let user = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (user) {
      console.log("[Register] User already exists with email or username");
      return res.status(400).json({
        success: false,
        message: `User with this ${user.email === email ? "email" : "username"} already exists`,
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    user = await User.create({
      name,
      username,
      email,
      phoneNumber,
      password: hashedPassword,
      role: assignedRole
    });

    console.log("[Register] User created successfully:", user._id);

    // Generate token
    const token = generateToken(user._id);

    // Remove password from response
    user = user.toObject();
    delete user.password;

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      token,
      user,
    });
  } catch (error) {
    console.error("[Register] Error:", error);
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field} already exists`,
      });
    }
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validation
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide username and password",
      });
    }

    console.log("[Login] User attempting to login:", username);

    // Check for user
    const user = await User.findOne({
      $or: [{ username }, { email: username }],
    }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Check password
    const isPasswordMatch = await bcrypt.compare(password, user.password);

    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Generate token
    const token = generateToken(user._id);

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    console.log("[Login] User logged in successfully:", user._id);

    res.status(200).json({
      success: true,
      message: "Logged in successfully",
      token,
      user: userResponse,
    });
  } catch (error) {
    console.error("[Login] Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Check if username is available
// @route   POST /api/auth/check-username
// @access  Public
exports.checkUsername = async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({
        success: false,
        message: "Please provide a username",
      });
    }

    console.log("[checkUsername] Checking username:", username);

    const user = await User.findOne({ username: username.toLowerCase() });

    res.status(200).json({
      success: true,
      available: !user,
      message: user ? "Username already taken" : "Username available",
    });
  } catch (error) {
    console.error("[checkUsername] Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("[getMe] Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Toggle Favorite
// @route   POST /api/auth/favorites/toggle
// @access  Private
exports.toggleFavorite = async (req, res) => {
  try {
    const { petId } = req.body;
    const userId = req.user.id;

    if (!petId) {
      return res.status(400).json({
        success: false,
        message: "Please provide a pet ID",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isFavorite = user.favorites.includes(petId);

    if (isFavorite) {
      // Remove from favorites
      user.favorites = user.favorites.filter((id) => id.toString() !== petId);
    } else {
      // Add to favorites
      user.favorites.push(petId);
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: isFavorite ? "Removed from favorites" : "Added to favorites",
      isFavorite: !isFavorite,
      favoritesCount: user.favorites.length,
    });
  } catch (error) {
    console.error("[toggleFavorite] Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get Favorites
// @route   GET /api/auth/favorites
// @access  Private
exports.getFavorites = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).populate({
      path: "favorites",
      populate: [
        { path: "type", select: "name" },
        { path: "createdBy", select: "name username" },
      ],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      data: user.favorites,
      count: user.favorites.length,
    });
  } catch (error) {
    console.error("[getFavorites] Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const { name, email, phoneNumber, password, profileImage } = req.body;
    const userId = req.user.id;

    let user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Update fields
    if (name) user.name = name;
    if (email) user.email = email;
    if (phoneNumber) user.phoneNumber = phoneNumber;
    if (profileImage !== undefined) user.profileImage = profileImage;

    // Update password if provided
    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    await user.save();

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: userResponse,
    });
  } catch (error) {
    console.error("[updateProfile] Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
