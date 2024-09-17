const db = require("../utils/db.config.js");
const z = require("zod");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const {
  CreateCompanySchema,
  UpdateCompanySchema,
} = require("../schema/companies");
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

// get All Company
const getAllCompanies = async (req, res, next) => {
  try {
    const companies = await db.companies.findMany({
      include: {
        users: true,
      },
    });
    res.status(200).json({ status: "success", companies });
  } catch (error) {
    next(error);
  }
};

// update company
const updateCompany = async (req, res, next) => {
  try {
    UpdateCompanySchema.parse(req.body);

    const {
      companyId,
      companyName,
      address,
      contactPerson,
      phone,
      email,
      gst,
      userId,
    } = req.body;

    // Convert companyId and userId to integers
    const companyIdNumber = parseInt(companyId, 10);
    const userIdNumber = parseInt(userId, 10);

    if (isNaN(companyIdNumber)) {
      throw new AppError("Invalid company ID provided!", 400);
    }

    if (userId && isNaN(userIdNumber)) {
      throw new AppError("Invalid user ID provided!", 400);
    }

    // Find the company to be updated
    const existingCompany = await db.companies.findUnique({
      where: { id: companyIdNumber },
    });

    if (!existingCompany) {
      throw new AppError("Company not found!", 404);
    }

    // Check if the new company name is already taken by another company
    if (companyName && companyName !== existingCompany.companyName) {
      const companyNameExists = await db.companies.findUnique({
        where: { companyName },
      });

      if (companyNameExists) {
        throw new AppError(
          "Company name already in use by another company!",
          400
        );
      }
    }

    // Get file paths for PAN card and Aadhaar card images if uploaded
    const pancardImage = req.files?.pancard
      ? req.files.pancard[0].path
      : existingCompany.pancard;
    const aadhaarcardImage = req.files?.aadhaarcard
      ? req.files.aadhaarcard[0].path
      : existingCompany.aadhaarcard;

    // Update the company in the database
    const updatedCompany = await db.companies.update({
      where: { id: companyIdNumber },
      data: {
        companyName: companyName || existingCompany.companyName,
        address: address || existingCompany.address,
        contactPerson: contactPerson || existingCompany.contactPerson,
        phone: phone || existingCompany.phone,
        email: email || existingCompany.email,
        gst: gst || existingCompany.gst,
        pancard: pancardImage, // Store PAN card image path if updated
        aadhaarcard: aadhaarcardImage, // Store Aadhaar card image path if updated
      },
    });

    // Optionally reassign the company to a user if userId is provided
    if (userIdNumber) {
      const user = await db.user.findUnique({ where: { id: userIdNumber } });
      if (!user) throw new AppError("User not found!", 404);

      await db.user.update({
        where: { id: userIdNumber },
        data: { companyId: updatedCompany.id },
      });
    }

    // Respond with success message and updated company data
    else
      res.status(200).json({
        message: "Company updated successfully!",
        company: updatedCompany,
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

// TODO: Delete company api

module.exports = { createCompany, upload, getAllCompanies, updateCompany };
