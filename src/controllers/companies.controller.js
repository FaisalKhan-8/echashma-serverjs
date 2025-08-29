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
const cache = require('../utils/cache');

function cacheKey(companyId) {
  return `company:${companyId}:whatsapp`;
}
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
  { name: 'adharcard', maxCount: 1 },
  { name: 'companyLogo', maxCount: 1 },
]);

// Create Company Controller
const createCompany = async (req, res, next) => {
  try {
    // Check if the logged-in user has permission to create a company
    const userRole = req.user.role;
    if (userRole === 'SUBADMIN' || userRole === 'MANAGER') {
      throw new AppError(
        'You do not have permission to create a company!',
        403
      );
    }

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
    const aadhaarcardImage = req.files?.adharcard
      ? req.files.adharcard[0].filename
      : null; // Get only the filename
    const companyLogoImage = req.files?.companyLogo
      ? req.files.companyLogo[0].filename
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

    // Check that SUBADMINs are assigned to only one company
    if (userId.length) {
      const subadmins = await db.user.findMany({
        where: {
          id: { in: userId },
          role: 'SUBADMIN',
        },
      });

      // Validate that no SUBADMIN is already assigned to a company
      for (let subadmin of subadmins) {
        if (subadmin.companyId) {
          throw new AppError('SUBADMIN is already assigned to a company!', 400);
        }
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
        companyLogo: companyLogoImage,
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
  const userRole = req.user.role;
  const userCompanyId = req.user.companyId;

  try {
    let whereCondition = {
      companyName: {
        contains: searchTerm,
      },
    };

    switch (userRole) {
      case 'SUPER_ADMIN':
        break;

      case 'ADMIN':
      case 'SUBADMIN':
      case 'MANAGER':
        if (!userCompanyId) {
          throw new AppError(
            `No company assigned to this ${userRole.toLowerCase()}`,
            401
          );
        }
        whereCondition = { ...whereCondition, id: userCompanyId };
        break;

      default:
        throw new AppError('Invalid user role', 401);
    }

    const totalRecords = await db.company.count({ where: whereCondition });

    const companies = await db.company.findMany({
      where: whereCondition,
      include: { users: true },
      skip: (pageNumber - 1) * pageSizeNumber,
      take: pageSizeNumber,
    });

    console.log(companies, 'companies');

    if (companies.length === 0) {
      throw new AppError('No companies found', 404);
    }

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
    // Error handling middleware
    if (error.isOperational) {
      res.status(error.statusCode).json({
        status: 'error',
        message: error.message,
      });
    } else {
      console.error(error); // Log the error details for debugging
      res.status(500).json({
        status: 'error',
        message: 'Internal Server Error',
      });
    }
    next(error); // Pass the error to the next middleware
  }
}

async function getCompanyById(req, res, next) {
  try {
    const { companyId } = req.params; // Extract companyId from the route parameters
    const { role } = req.user; // Get the role from the authenticated user

    // Validate companyId
    if (!companyId) {
      throw new AppError('Invalid companyId provided', 400);
    }

    // Validate role: Only SUPER_ADMIN, ADMIN, and SUB_ADMIN are allowed
    const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'SUBADMIN'];
    if (!allowedRoles.includes(role)) {
      throw new AppError(
        'Forbidden: You do not have permission to access this resource',
        403
      );
    }

    // Fetch the company based on companyId
    const company = await db.company.findUnique({
      where: { id: Number(companyId) }, // Ensure companyId is treated as a number
      include: {
        users: true, // Include related users
        branches: true, // Include related branches
      },
    });

    // If no company is found, return a 404 error
    if (!company) {
      throw new AppError('Company not found', 404);
    }

    // Return the company and related data
    return res.status(200).json({ company });
  } catch (error) {
    // Handle unexpected errors
    console.error(error);
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

const updateDocument = async (req, res, next) => {
  try {
    const { companyId } = req.params;

    // Check if the company exists
    const existingCompany = await db.company.findUnique({
      where: { id: Number(companyId) },
    });

    if (!existingCompany) {
      throw new AppError('Company not found!', 404);
    }

    // Get file paths for PAN card and Aadhaar card images
    const pancardImage = req.files?.pancard
      ? req.files.pancard[0].filename
      : null;
    const aadhaarcardImage = req.files?.adharcard
      ? req.files.adharcard[0].filename
      : null;
    const companyLogoImage = req.files?.companyLogo
      ? req.files.companyLogo[0].filename
      : null; // Get only the filename

    // Prepare update object
    const updateData = {};
    if (pancardImage) updateData.pancard = pancardImage;
    if (aadhaarcardImage) updateData.aadhaarcard = aadhaarcardImage;
    if (pancardImage) updateData.pancard = pancardImage;
    if (companyLogoImage) updateData.companyLogo = companyLogoImage;

    if (Object.keys(updateData).length === 0) {
      throw new AppError('No valid documents provided for update!', 400);
    }

    // Update the company document
    const updatedCompany = await db.company.update({
      where: { id: Number(companyId) },
      data: updateData,
    });

    res.status(200).json({
      message: 'Company documents updated successfully!',
      company: updatedCompany,
    });
  } catch (error) {
    next(error);
  }
};

const deleteCompany = async (req, res, next) => {
  try {
    const { id } = req.params;
    const companyIdNumber = parseInt(id, 10);

    if (isNaN(companyIdNumber)) {
      throw new AppError('Invalid company ID format!', 400);
    }

    // Check if the company exists
    const existingCompany = await db.company.findUnique({
      where: { id: companyIdNumber },
      include: {
        branches: true, // Ensure we fetch related branches
      },
    });

    if (!existingCompany) {
      throw new AppError('Company not found!', 404);
    }

    // Prevent deletion if branches exist
    if (existingCompany.branches.length > 0) {
      throw new AppError('Cannot delete company with existing branches!', 400);
    }

    // Delete the company if no branches exist
    await db.company.delete({
      where: { id: companyIdNumber },
    });

    res.status(200).json({
      message: 'Company deleted successfully!',
    });
  } catch (error) {
    next(error);
  }
};

async function getCompanyWhatsAppConfig(companyId) {
  // 1) Check cache
  let conf = cache.get(cacheKey(companyId));
  if (conf) {
    console.log('WhatsApp Config (from cache):', conf);
    return conf;
  }

  // 2) Query DB
  const company = await db.company.findUnique({
    where: { id: Number(companyId) },
    select: {
      whatsappPhoneId: true,
      whatsappToken: true,
      companyName: true,
    },
  });

  if (!company) {
    throw new AppError('Company not found', 404);
  }

  // ✅ Check if credentials exist
  if (!company.whatsappPhoneId || !company.whatsappToken) {
    console.error('WhatsApp Config missing in DB for company:', {
      id: companyId,
      whatsappPhoneId: company.whatsappPhoneId,
      whatsappToken: company.whatsappToken,
    });
    throw new AppError(
      'WhatsApp credentials not configured for this company',
      400
    );
  }

  // 3) Normalize config
  conf = {
    whatsappPhoneId: company.whatsappPhoneId,
    whatsappToken: company.whatsappToken,
    companyName: company.companyName,
  };

  // 4) Save in cache
  cache.set(cacheKey(companyId), conf);

  console.log('WhatsApp Config (from DB):', conf);
  return conf;
}

async function setCompanyWhatsAppConfig(
  companyId,
  whatsappPhoneId,
  whatsappToken
) {
  const updated = await db.company.update({
    where: { id: Number(companyId) },
    data: { whatsappPhoneId, whatsappToken },
    select: { whatsappPhoneId: true, whatsappToken: true, companyName: true },
  });

  const conf = {
    phoneId: updated.whatsappPhoneId,
    token: updated.whatsappToken,
    companyName: updated.companyName,
  };
  cache.set(cacheKey(companyId), conf);
  return conf;
}

module.exports = {
  createCompany,
  upload,
  getAllCompanies,
  updateDocument,
  getCompanyById,
  updateCompany,
  deleteCompany,
  getCompanyWhatsAppConfig,
  setCompanyWhatsAppConfig,
};
