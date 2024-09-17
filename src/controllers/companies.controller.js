const db = require("../utils/db.config.js");
const z = require("zod");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { CreateCompanySchema } = require("../schema/companies");
const { AppError } = require("../errors/AppError.js");

// Ensure the uploads directory exists
const uploadDir = path.join(__dirname, "../uploads/");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Set up multer for image upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir); // Use the uploads directory
  },
  filename: function (req, file, cb) {
    // Fetch the username from the request body
    const username = req.body.contactPerson || "anonymous"; // Default to "anonymous" if no username provided
    const sanitizedUsername = username.replace(/\s+/g, "_"); // Replace spaces with underscores
    cb(null, `${sanitizedUsername}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    // Only allow image files
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only images are allowed"), false);
    }
    cb(null, true);
  },
});

// Create Company Controller
const createCompany = async (req, res, next) => {
  try {
    // Parse form data (excluding files) with Zod validation
    const parsedBody = CreateCompanySchema.parse(req.body);

    const { companyName, address, contactPerson, phone, email, gst, userId } =
      parsedBody;

    // Check if the company already exists
    const existingCompany = await db.companies.findUnique({
      where: { companyName },
    });

    if (existingCompany) {
      throw new AppError("Company already exists!", 400);
    }

    // Get file paths for PAN card and Aadhaar card images
    const pancardImage = req.files?.pancard ? req.files.pancard[0].path : null;
    const aadhaarcardImage = req.files?.aadhaarcard
      ? req.files.aadhaarcard[0].path
      : null;

    // Create the new company in the database
    const newCompany = await db.companies.create({
      data: {
        companyName,
        address,
        contactPerson,
        phone, // Ensure phone is an integer
        email,
        gst,
        pancard: pancardImage, // Store PAN card image path
        aadhaarcard: aadhaarcardImage, // Store Aadhaar card image path
      },
    });

    // Optionally assign the company to a user if userId is provided
    if (userId) {
      const user = await db.user.findUnique({ where: { id: userId } });
      if (!user) throw new AppError("User not found!", 404);

      await db.user.update({
        where: { id: userId },
        data: { companyId: newCompany.id },
      });
    }

    // Return a successful response
    res.status(201).json({
      message: "Company created successfully!",
      company: newCompany,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        status: "error",
        message: "Validation failed",
        errors: error.errors,
      });
    }

    next(error);
  }
};

module.exports = { createCompany, upload };
