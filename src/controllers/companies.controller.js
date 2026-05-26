const db = require('../utils/db.config.js')
const z = require('zod')
const bcrypt = require('bcryptjs')
const { hashSync } = bcrypt
const multer = require('multer')
const { randomUUID } = require('crypto')
const {
  CreateCompanySchema,
  UpdateCompanySchema,
  RegisterCompanySchema
} = require('../schema/companies.js')
const { AppError } = require('../errors/AppError.js')
const {
  resolveMembershipWindow,
  newRegistrationMembershipDates
} = require('../utils/membershipDates.js')
const cache = require('../utils/cache')
const { uploadMulterFile } = require('../utils/s3.js')

function cacheKey(companyId) {
  return `company:${companyId}:whatsapp`
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only images are allowed'), false)
    }
    cb(null, true)
  }
}).fields([
  { name: 'pancard', maxCount: 1 },
  { name: 'adharcard', maxCount: 1 },
  { name: 'companyLogo', maxCount: 1 }
])

// Create Company Controller
const createCompany = async (req, res, next) => {
  try {
    // Check if the logged-in user has permission to create a company
    const userRole = req.user.role
    if (userRole === 'SUBADMIN' || userRole === 'MANAGER') {
      throw new AppError('You do not have permission to create a company!', 403)
    }

    // Validate request body
    const parsedBody = CreateCompanySchema.parse(req.body)

    const {
      companyName,
      address,
      contactPerson,
      phone,
      email,
      gst,
      membership,
      membershipStartDate,
      membershipEndDate,
      userId = []
    } = parsedBody

    const membershipDates = resolveMembershipWindow({
      membershipStartDate,
      membershipEndDate
    })

    // Check if the company already exists
    const existingCompany = await db.company.findUnique({
      where: { companyName }
    })

    if (existingCompany) {
      throw new AppError(
        `Company with name "${companyName}" already exists! Please choose a different company name.`,
        400
      )
    }

    const s3Folder = `companies/${randomUUID()}`
    const pancardImage = req.files?.pancard?.[0]
      ? await uploadMulterFile(req.files.pancard[0], s3Folder)
      : null
    const aadhaarcardImage = req.files?.adharcard?.[0]
      ? await uploadMulterFile(req.files.adharcard[0], s3Folder)
      : null
    const companyLogoImage = req.files?.companyLogo?.[0]
      ? await uploadMulterFile(req.files.companyLogo[0], s3Folder)
      : null

    // Check if the GST number is already in use
    if (gst) {
      const existingGst = await db.company.findUnique({
        where: { gst }
      })
      if (existingGst) {
        throw new AppError(
          `GST number "${gst}" is already in use by another company! Please use a different GST number.`,
          400
        )
      }
    }

    // Check if the email is already in use
    if (email) {
      const existingEmail = await db.company.findUnique({
        where: { email }
      })
      if (existingEmail) {
        throw new AppError(
          `Email "${email}" is already in use by another company! Please use a different email address.`,
          400
        )
      }
    }

    // Check if the phone is already in use
    if (phone) {
      const existingPhone = await db.company.findUnique({
        where: { phone }
      })
      if (existingPhone) {
        throw new AppError(
          `Phone number "${phone}" is already in use by another company! Please use a different phone number.`,
          400
        )
      }
    }

    // Check that SUBADMINs are assigned to only one company
    if (userId.length) {
      const subadmins = await db.user.findMany({
        where: {
          id: { in: userId },
          role: 'SUBADMIN'
        }
      })

      // Validate that no SUBADMIN is already assigned to a company
      for (let subadmin of subadmins) {
        if (subadmin.companyId) {
          throw new AppError(
            `SUBADMIN user "${
              subadmin.name || subadmin.email
            }" is already assigned to a company! Please select a different user or remove them from their current company first.`,
            400
          )
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
        membership,
        ...membershipDates,
        pancard: pancardImage,
        aadhaarcard: aadhaarcardImage,
        companyLogo: companyLogoImage,
        users: {
          connect: userId.map((id) => ({ id }))
        }
      }
    })

    // Return a successful response
    res.status(201).json({
      message: 'Company created successfully!',
      company: newCompany
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Format validation errors to be more user-friendly
      const formattedErrors = error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
        value: err.input
      }))

      return res.status(400).json({
        status: 'error',
        message: 'Validation failed. Please check the following fields:',
        errors: formattedErrors
      })
    }

    // Handle database constraint violations
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0] || 'field'
      const fieldValue =
        error.meta?.target?.length > 1 ? error.meta.target[1] : ''

      console.error('Database constraint violation:', {
        code: error.code,
        field: field,
        target: error.meta?.target,
        message: error.message
      })

      // Provide specific error messages based on the field
      let errorMessage = ''
      switch (field) {
        case 'companyName':
          errorMessage = `Company name "${fieldValue}" already exists! Please choose a different company name.`
          break
        case 'email':
          errorMessage = `Email "${fieldValue}" is already in use! Please use a different email address.`
          break
        case 'phone':
          errorMessage = `Phone number "${fieldValue}" is already in use! Please use a different phone number.`
          break
        case 'gst':
          errorMessage = `GST number "${fieldValue}" is already in use! Please use a different GST number.`
          break
        default:
          errorMessage = `${field} already exists. Please use a different ${field}.`
      }

      return res.status(400).json({
        status: 'error',
        message: errorMessage
      })
    }

    // Log unexpected errors for debugging
    console.error('Unexpected error in createCompany:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      meta: error.meta
    })

    next(error)
  }
}

const REGISTER_COMPANY_KYC = 'UNVERIFIED'
const REGISTER_COMPANY_MEMBERSHIP = 'TRIAL'

/** Public signup: creates Company + first ADMIN user in one transaction. */
const registerCompany = async (req, res, next) => {
  try {
    const parsedBody = RegisterCompanySchema.parse(req.body)
    const { companyName, email, phone, contactPerson, password, address, gst } =
      parsedBody

    const membershipDates = newRegistrationMembershipDates()

    const hashedPassword = hashSync(password, 10)

    const result = await db.$transaction(
      async (tx) => {
        const existingCompanyByName = await tx.company.findUnique({
          where: { companyName }
        })
        if (existingCompanyByName) {
          throw new AppError(
            `Company with name "${companyName}" already exists.`,
            400
          )
        }

        const existingCompanyByEmail = await tx.company.findUnique({
          where: { email }
        })
        if (existingCompanyByEmail) {
          throw new AppError(
            `A company is already registered with email "${email}".`,
            400
          )
        }

        const existingUser = await tx.user.findUnique({ where: { email } })
        if (existingUser) {
          throw new AppError('A user already exists with this email.', 400)
        }

        if (phone) {
          const existingPhone = await tx.company.findFirst({
            where: { phone }
          })
          if (existingPhone) {
            throw new AppError(
              `Phone number "${phone}" is already in use by another company.`,
              400
            )
          }
        }

        if (gst) {
          const existingGst = await tx.company.findFirst({
            where: { gst }
          })
          if (existingGst) {
            throw new AppError(
              `GST number "${gst}" is already in use by another company.`,
              400
            )
          }
        }

        const company = await tx.company.create({
          data: {
            companyName,
            address: address ?? null,
            contactPerson,
            phone,
            email,
            gst: gst ?? null,
            kyc: REGISTER_COMPANY_KYC,
            membership: REGISTER_COMPANY_MEMBERSHIP,
            ...membershipDates
          }
        })

        const user = await tx.user.create({
          data: {
            email,
            password: hashedPassword,
            password_visible: password,
            name: contactPerson,
            role: 'ADMIN',
            companyId: company.id
          }
        })

        return { company, user }
      },
      {
        maxWait: 10_000,
        timeout: 20_000
      }
    )

    const { password: _p, password_visible: _pv, ...userPublic } = result.user

    res.status(201).json({
      message: 'Company registered successfully.',
      company: result.company,
      user: userPublic
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors = error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
        value: err.input
      }))
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed. Please check the following fields:',
        errors: formattedErrors
      })
    }

    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0] || 'field'
      let errorMessage = `${field} already exists. Please use a different value.`
      return res.status(400).json({
        status: 'error',
        message: errorMessage
      })
    }

    next(error)
  }
}

// get All Company
async function getAllCompanies(req, res, next) {
  const { page = 1, pageSize = 10, searchTerm = '' } = req.query
  const pageSizeNumber = parseInt(pageSize, 10) || 10
  const pageNumber = parseInt(page, 10) || 1
  const userRole = req.user.role
  const userCompanyId = req.user.companyId

  try {
    let whereCondition = {
      companyName: {
        contains: searchTerm
      }
    }

    switch (userRole) {
      case 'SUPER_ADMIN':
        break

      case 'ADMIN':
      case 'SUBADMIN':
      case 'MANAGER':
        if (!userCompanyId) {
          throw new AppError(
            `No company assigned to this ${userRole.toLowerCase()}`,
            401
          )
        }
        whereCondition = { ...whereCondition, id: userCompanyId }
        break

      default:
        throw new AppError('Invalid user role', 401)
    }

    const totalRecords = await db.company.count({ where: whereCondition })

    const companies = await db.company.findMany({
      where: whereCondition,
      include: { users: true },
      skip: (pageNumber - 1) * pageSizeNumber,
      take: pageSizeNumber
    })

    console.log(companies, 'companies')

    if (companies.length === 0) {
      throw new AppError('No companies found', 404)
    }

    res.json({
      companies,
      pagination: {
        page: pageNumber,
        pageSize: pageSizeNumber,
        totalRecords,
        totalPages: Math.ceil(totalRecords / pageSizeNumber)
      }
    })
  } catch (error) {
    // Error handling middleware
    if (error.isOperational) {
      res.status(error.statusCode).json({
        status: 'error',
        message: error.message
      })
    } else {
      console.error(error) // Log the error details for debugging
      res.status(500).json({
        status: 'error',
        message: 'Internal Server Error'
      })
    }
    next(error) // Pass the error to the next middleware
  }
}

async function getCompanyById(req, res, next) {
  try {
    const { companyId } = req.params // Extract companyId from the route parameters
    const { role } = req.user // Get the role from the authenticated user

    // Validate companyId
    if (!companyId) {
      throw new AppError('Invalid companyId provided', 400)
    }

    // Validate role: Only SUPER_ADMIN, ADMIN, and SUB_ADMIN are allowed
    const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'SUBADMIN']
    if (!allowedRoles.includes(role)) {
      throw new AppError(
        'Forbidden: You do not have permission to access this resource',
        403
      )
    }

    // Fetch the company based on companyId
    const company = await db.company.findUnique({
      where: { id: Number(companyId) }, // Ensure companyId is treated as a number
      include: {
        users: true, // Include related users
        branches: true // Include related branches
      }
    })

    // If no company is found, return a 404 error
    if (!company) {
      throw new AppError('Company not found', 404)
    }

    // Return the company and related data
    return res.status(200).json({ company })
  } catch (error) {
    // Handle unexpected errors
    console.error(error)
    next(error)
  }
}

// update company
const updateCompany = async (req, res, next) => {
  try {
    // Validate request body
    const parsedBody = UpdateCompanySchema.parse(req.body)

    const {
      companyId,
      companyName,
      address,
      contactPerson,
      phone,
      email,
      gst,
      membership,
      membershipStartDate,
      membershipEndDate,
      userId
    } = parsedBody

    const membershipDatePatch =
      membershipStartDate !== undefined || membershipEndDate !== undefined
        ? resolveMembershipWindow({ membershipStartDate, membershipEndDate })
        : {}

    // Convert companyId to integer
    const companyIdNumber = parseInt(companyId, 10)

    if (isNaN(companyIdNumber)) {
      throw new AppError('Invalid company ID provided!', 400)
    }

    // Find the company to be updated
    const existingCompany = await db.company.findUnique({
      where: { id: companyIdNumber }
    })

    if (!existingCompany) {
      throw new AppError('Company not found!', 404)
    }

    // Check if the new company name is already taken by another company
    if (companyName && companyName !== existingCompany.companyName) {
      const companyNameExists = await db.company.findUnique({
        where: { companyName }
      })

      if (companyNameExists) {
        throw new AppError(
          `Company name "${companyName}" is already in use by another company! Please choose a different company name.`,
          400
        )
      }
    }

    // Check if the new email is already taken by another company
    if (email && email !== existingCompany.email) {
      const emailExists = await db.company.findUnique({
        where: { email }
      })

      if (emailExists) {
        throw new AppError(
          `Email "${email}" is already in use by another company! Please use a different email address.`,
          400
        )
      }
    }

    // Check if the new phone is already taken by another company
    if (phone && phone !== existingCompany.phone) {
      const phoneExists = await db.company.findUnique({
        where: { phone }
      })

      if (phoneExists) {
        throw new AppError(
          `Phone number "${phone}" is already in use by another company! Please use a different phone number.`,
          400
        )
      }
    }

    // Check if the new GST is already taken by another company
    if (gst && gst !== existingCompany.gst) {
      const gstExists = await db.company.findUnique({
        where: { gst }
      })

      if (gstExists) {
        throw new AppError(
          `GST number "${gst}" is already in use by another company! Please use a different GST number.`,
          400
        )
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
        ...(membership !== undefined ? { membership } : {}),
        ...membershipDatePatch,
        // Do not update images
        users:
          userId && userId.length > 0
            ? { connect: userId.map((id) => ({ id })) } // Connect multiple users to the company
            : undefined
      }
    })

    // Respond with success message and updated company data
    res.status(200).json({
      message: 'Company updated successfully!',
      company: updatedCompany
    })
  } catch (error) {
    console.error('Error:', error)
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: error.errors
      })
    }

    // Handle database constraint violations
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0] || 'field'
      console.error('Database constraint violation in updateCompany:', {
        code: error.code,
        field: field,
        target: error.meta?.target,
        message: error.message
      })
      return res.status(400).json({
        status: 'error',
        message: `${field} already exists. Please use a different ${field}.`
      })
    }

    next(error) // Pass the error to your error handling middleware
  }
}

const updateDocument = async (req, res, next) => {
  try {
    const { companyId } = req.params

    // Check if the company exists
    const existingCompany = await db.company.findUnique({
      where: { id: Number(companyId) }
    })

    if (!existingCompany) {
      throw new AppError('Company not found!', 404)
    }

    const companyIdNum = Number(companyId)
    const s3Folder = `companies/${companyIdNum}/documents`
    const pancardImage = req.files?.pancard?.[0]
      ? await uploadMulterFile(req.files.pancard[0], s3Folder)
      : null
    const aadhaarcardImage = req.files?.adharcard?.[0]
      ? await uploadMulterFile(req.files.adharcard[0], s3Folder)
      : null
    const companyLogoImage = req.files?.companyLogo?.[0]
      ? await uploadMulterFile(req.files.companyLogo[0], s3Folder)
      : null

    const updateData = {}
    if (pancardImage) updateData.pancard = pancardImage
    if (aadhaarcardImage) updateData.aadhaarcard = aadhaarcardImage
    if (companyLogoImage) updateData.companyLogo = companyLogoImage

    if (Object.keys(updateData).length === 0) {
      throw new AppError('No valid documents provided for update!', 400)
    }

    // Update the company document
    const updatedCompany = await db.company.update({
      where: { id: Number(companyId) },
      data: updateData
    })

    res.status(200).json({
      message: 'Company documents updated successfully!',
      company: updatedCompany
    })
  } catch (error) {
    next(error)
  }
}

const deleteCompany = async (req, res, next) => {
  try {
    const { id } = req.params
    const companyIdNumber = parseInt(id, 10)

    if (isNaN(companyIdNumber)) {
      throw new AppError('Invalid company ID format!', 400)
    }

    // Check if the company exists
    const existingCompany = await db.company.findUnique({
      where: { id: companyIdNumber },
      include: {
        branches: true // Ensure we fetch related branches
      }
    })

    if (!existingCompany) {
      throw new AppError('Company not found!', 404)
    }

    // Prevent deletion if branches exist
    if (existingCompany.branches.length > 0) {
      throw new AppError('Cannot delete company with existing branches!', 400)
    }

    // Delete the company if no branches exist
    await db.company.delete({
      where: { id: companyIdNumber }
    })

    res.status(200).json({
      message: 'Company deleted successfully!'
    })
  } catch (error) {
    next(error)
  }
}

async function getCompanyWhatsAppConfig(companyId) {
  // 1) Check cache
  let conf = cache.get(cacheKey(companyId))
  if (conf) {
    console.log('WhatsApp Config (from cache):', conf)
    return conf
  }

  // 2) Query DB
  const company = await db.company.findUnique({
    where: { id: Number(companyId) },
    select: {
      whatsappPhoneId: true,
      whatsappToken: true,
      companyName: true
    }
  })

  if (!company) {
    throw new AppError('Company not found', 404)
  }

  // ✅ Check if credentials exist
  if (!company.whatsappPhoneId || !company.whatsappToken) {
    console.error('WhatsApp Config missing in DB for company:', {
      id: companyId,
      whatsappPhoneId: company.whatsappPhoneId,
      whatsappToken: company.whatsappToken
    })
    throw new AppError(
      'WhatsApp credentials not configured for this company',
      400
    )
  }

  // 3) Normalize config
  conf = {
    whatsappPhoneId: company.whatsappPhoneId,
    whatsappToken: company.whatsappToken,
    companyName: company.companyName
  }

  // 4) Save in cache
  cache.set(cacheKey(companyId), conf)

  console.log('WhatsApp Config (from DB):', conf)
  return conf
}

async function setCompanyWhatsAppConfig(
  companyId,
  whatsappPhoneId,
  whatsappToken
) {
  const updated = await db.company.update({
    where: { id: Number(companyId) },
    data: { whatsappPhoneId, whatsappToken },
    select: { whatsappPhoneId: true, whatsappToken: true, companyName: true }
  })

  const conf = {
    phoneId: updated.whatsappPhoneId,
    token: updated.whatsappToken,
    companyName: updated.companyName
  }
  cache.set(cacheKey(companyId), conf)
  return conf
}

module.exports = {
  createCompany,
  registerCompany,
  upload,
  getAllCompanies,
  updateDocument,
  getCompanyById,
  updateCompany,
  deleteCompany,
  getCompanyWhatsAppConfig,
  setCompanyWhatsAppConfig
}
