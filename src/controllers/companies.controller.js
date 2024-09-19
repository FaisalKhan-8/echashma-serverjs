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
    // Validate request body
    const parsedBody = CreateCompanySchema.parse(req.body);

    const {
      companyName,
      address,
      contactPerson,
      phone,
      email,
      gst,
      userId = [],
    } = parsedBody;

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

    // Check if the GST number is already in use
    if (gst) {
      const existingGst = await db.companies.findUnique({
        where: { gst },
      });
      if (existingGst) {
        throw new AppError(
          "GST number already in use by another company!",
          400
        );
      }
    }

    // Check if the email is already in use
    if (email) {
      const existingEmail = await db.companies.findUnique({
        where: { email },
      });
      if (existingEmail) {
        throw new AppError("Email already in use by another company!", 400);
      }
    }

    // Create the new company in the database
    const newCompany = await db.companies.create({
      data: {
        companyName,
        address,
        contactPerson,
        phone,
        email,
        gst,
        pancard: pancardImage,
        aadhaarcard: aadhaarcardImage,
        users: {
          connect: userId.map((id) => ({ id })),
        },
      },
    });

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
async function getAllCompanies(req, res) {
  const { page = 1, pageSize = 10, searchTerm = "" } = req.query;
  const pageSizeNumber = parseInt(pageSize, 10) || 10;
  const pageNumber = parseInt(page, 10) || 1;

  // Get the total count of companies matching the search term
  const companiesCount = await db.companies.findMany({
    where: {
      companyName: {
        contains: searchTerm,
        // Remove mode: "insensitive"
      },
    },
    select: {
      id: true, // Just an example; select any field you need
    },
  });

  const totalRecords = companiesCount.length;

  // Now, retrieve the companies with pagination
  const companies = await db.companies.findMany({
    where: {
      companyName: {
        contains: searchTerm,
      },
    },
    skip: (pageNumber - 1) * pageSizeNumber,
    take: pageSizeNumber,
  });

  res.json({
    companies,
    pagination: {
      page: pageNumber,
      pageSize: pageSizeNumber,
      totalRecords,
      totalPages: Math.ceil(totalRecords / pageSizeNumber),
    },
  });
}

// update company
const updateCompany = async (req, res, next) => {
  try {
    // Validate request body
    const parsedBody = UpdateCompanySchema.parse(req.body);

    const {
      companyId,
      companyName,
      address,
      contactPerson,
      phone,
      email,
      gst,
      userId,
    } = parsedBody;

    // Convert companyId to integer
    const companyIdNumber = parseInt(companyId, 10);

    if (isNaN(companyIdNumber)) {
      throw new AppError("Invalid company ID provided!", 400);
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
        users:
          userId && userId.length > 0
            ? { connect: userId.map((id) => ({ id })) } // Connect multiple users to the company
            : undefined,
      },
    });

    // Respond with success message and updated company data
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
