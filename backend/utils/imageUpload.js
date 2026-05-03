const multer = require("multer");
const path = require("path");

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error("Only image files are allowed (jpeg, jpg, png, gif)"));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: fileFilter,
});

exports.uploadImages = upload.array("images", 5);

exports.convertImagesToBase64 = (req, res, next) => {
  try {
    if (req.files && req.files.length > 0) {
      req.body.images = req.files.map((file) => {
        return `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
      });
    }
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error processing images: " + error.message,
    });
  }
};

exports.handleBase64Images = (req, res, next) => {
  try {
    if (req.body.images && Array.isArray(req.body.images)) {
      const validImages = req.body.images.filter((img) => {
        if (typeof img === "string" && img.startsWith("data:")) {
          return img.length < 5 * 1024 * 1024;
        }
        return false;
      });
      req.body.images = validImages;
    }
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error validating images: " + error.message,
    });
  }
};
