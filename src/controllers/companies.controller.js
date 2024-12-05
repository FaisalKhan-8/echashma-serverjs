const db = require('../utils/db.config.js');
const z = require('zod');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const {
  CreateCompanySchema,
  UpdateCompanySchema,
} = require('../schema/companies.js');
const { AppError } = require('../errors/AppError.js');

// Ensure the uploads directory exists
const uploadDir = path.join(process.cwd(), 'uploads');
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
    const username = req.body.contactPerson || 'anonymous'; // Default to "anonymous" if no username provided
    const sanitizedUsername = username.replace(/\s+/g, '_'); // Replace spaces with underscores
    cb(null, `${sanitizedUsername}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only images are allowed'), false);
    }
    cb(null, true);
  },
}).fields([
  { name: 'pancard', maxCount: 1 },
  { name: 'aadhaarcard', maxCount: 1 },
]);

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
    const existingCompany = await db.company.findUnique({
      where: { companyName },
    });

    if (existingCompany) {
      throw new AppError('Company already exists!', 400);
    }

    // Get file paths for PAN card and Aadhaar card images
    const pancardImage = req.files?.pancard
      ? req.files.pancard[0].filename
      : null; // Get only the filename
    const aadhaarcardImage = req.files?.aadhaarcard
      ? req.files.aadhaarcard[0].filename
      : null; // Get only the filename

    // Check if the GST number is already in use
    if (gst) {
      const existingGst = await db.company.findUnique({
        where: { gst },
      });
      if (existingGst) {
        throw new AppError(
          'GST number already in use by another company!',
          400
        );
      }
    }

    // Check if the email is already in use
    if (email) {
      const existingEmail = await db.company.findUnique({
        where: { email },
      });
      if (existingEmail) {
        throw new AppError('Email already in use by another company!', 400);
      }
    }

    // Create the new company in the database
    const newCompany = await db.company.create({
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
      message: 'Company created successfully!',
      company: newCompany,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: error.errors,
      });
    }

    next(error);
  }
};

// get All Company
async function getAllCompanies(req, res, next) {
  const { page = 1, pageSize = 10, searchTerm = '' } = req.query;
  const pageSizeNumber = parseInt(pageSize, 10) || 10;
  const pageNumber = parseInt(page, 10) || 1;
  const userId = req.user.id;
  const userRole = req.user.role;

  try {
    let whereCondition = {
      companyName: {
        contains: searchTerm,
      },
    };

    switch (userRole) {
      case 'ADMIN':
        break;
      case 'SUBADMIN':
        whereCondition = {
          ...whereCondition,
          users: {
            some: {
              id: userId,
            },
          },
        };
        break;
      case 'MANAGER':
        whereCondition = {
          ...whereCondition,
          users: {
            some: {
              role: 'SUBADMIN',
              managerId: userId,
            },
          },
        };
        break;
      default:
        throw new Error('Invalid user role');
    }

    const totalRecords = await db.company.count({
      where: whereCondition,
    });

    const companies = await db.company.findMany({
      where: whereCondition,
      include: {
        users: true,
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
  } catch (error) {
    next(error);
  }
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
      throw new AppError('Invalid company ID provided!', 400);
    }

    // Find the company to be updated
    const existingCompany = await db.company.findUnique({
      where: { id: companyIdNumber },
    });

    if (!existingCompany) {
      throw new AppError('Company not found!', 404);
    }

    // Check if the new company name is already taken by another company
    if (companyName && companyName !== existingCompany.companyName) {
      const companyNameExists = await db.company.findUnique({
        where: { companyName },
      });

      if (companyNameExists) {
        throw new AppError(
          'Company name already in use by another company!',
          400
        );
      }
    }

    // Update the company in the database without updating images
    const updatedCompany = await db.company.update({
      where: { id: companyIdNumber },
      data: {
        companyName: companyName || existingCompany.companyName,
        address: address || existingCompany.address,
        contactPerson: contactPerson || existingCompany.contactPerson,
        phone: phone || existingCompany.phone,
        email: email || existingCompany.email,
        gst: gst || existingCompany.gst,
        // Do not update images
        users:
          userId && userId.length > 0
            ? { connect: userId.map((id) => ({ id })) } // Connect multiple users to the company
            : undefined,
      },
    });

    // Respond with success message and updated company data
    res.status(200).json({
      message: 'Company updated successfully!',
      company: updatedCompany,
    });
  } catch (error) {
    console.error('Error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: error.errors,
      });
    }

    next(error); // Pass the error to your error handling middleware
  }
};

const deleteCompany = async (req, res, next) => {
  try {
    // Destructure the id from params
    const { id } = req.params; // Correctly extract the id

    // Convert id to integer
    const companyIdNumber = parseInt(id, 10);

    // Validate the ID
    if (isNaN(companyIdNumber)) {
      throw new AppError('Invalid company ID format!', 400);
    }

    // Check if the company exists
    const existingCompany = await db.company.findUnique({
      where: { id: companyIdNumber }, // Use the parsed number here
    });

    if (!existingCompany) {
      throw new AppError('Company not found!', 404);
    }

    // Delete the company
    await db.company.delete({
      where: { id: companyIdNumber },
    });

    // Respond with success message
    res.status(200).json({
      message: 'Company deleted successfully!',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createCompany,
  upload,
  getAllCompanies,
  updateCompany,
  deleteCompany,
};
