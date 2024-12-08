const db = require('../utils/db.config.js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { LoginUserSchema, UpdateUserSchema } = require('../schema/user.js');
const { AppError } = require('../errors/AppError.js');
const { z } = require('zod');
const upload = require('../middleware/upload.js');

const { hashSync, compare } = bcrypt;

//TODO: user and company only take one email also for name
const CreateUser = async (req, res, next) => {
  console.log('Request body:', req.body);

  const { email, password, name, avatar, role, companyDetails } = req.body;
  const userRole = req.user.role; // Role of the logged-in user
  const userCompanyId = req.user.companyId; // For SUBADMIN, their assigned company ID

  // Validate required fields manually
  if (!password) {
    return next(
      new AppError('Missing required fields: password is mandatory', 400)
    );
  }

  // Extract file paths for pancard and aadhaarcard
  let pancardPath = null;
  let aadhaarcardPath = null;

  if (req.files) {
    pancardPath = req.files?.pancard ? req.files.pancard[0].path : null;
    aadhaarcardPath = req.files?.aadhaarcard
      ? req.files.aadhaarcard[0].path
      : null;
  }

  let companyId = null;
  let finalEmail = email; // Default to the user-provided email
  let finalName = name || req.body.contactPerson; // Use the contact person name if provided

  try {
    // Start a transaction
    const result = await db.$transaction(async (prisma) => {
      // If companyDetails is provided and the user is ADMIN, create the company first
      if (companyDetails && userRole === 'ADMIN') {
        // Ensure that companyName is provided
        if (!companyDetails.companyName) {
          throw new AppError(
            'Company name is required to create a company!',
            400
          );
        }

        // Ensure that the company doesn't already exist
        const existingCompany = await prisma.company.findUnique({
          where: { companyName: companyDetails.companyName },
        });

        if (existingCompany) {
          throw new AppError('Company already exists!', 400);
        }

        // Create a new company in the database
        const newCompany = await prisma.company.create({
          data: {
            companyName: companyDetails.companyName,
            address: companyDetails.address || null,
            contactPerson: companyDetails.contactPerson || null,
            phone: companyDetails.phone || null,
            email: companyDetails.email || email, // Use company email if provided, otherwise use user email
            gst: companyDetails.gst || null,
            pancard: pancardPath,
            aadhaarcard: aadhaarcardPath,
          },
        });

        // Store the company ID
        companyId = newCompany.id;
        console.log('Company created:', newCompany);

        // Update final email and name if company details include them
        finalEmail = companyDetails.email || email;
        finalName = companyDetails.contactPerson || name;
      } else if (userRole === 'SUBADMIN') {
        // Ensure SUBADMIN can only create users for their assigned company
        if (!userCompanyId) {
          throw new AppError(
            'Unauthorized: SUBADMIN must be assigned to a company',
            403
          );
        }

        companyId = userCompanyId;

        // Only allow SUBADMIN to create users with the "MANAGER" role
        if (role && role !== 'MANAGER') {
          throw new AppError(
            'Unauthorized: SUBADMIN can only create users with the "MANAGER" role',
            403
          );
        }
      }

      // Check if the user already exists with the provided email
      const existingUser = await prisma.user.findUnique({
        where: { email: finalEmail },
      });

      if (existingUser) {
        throw new AppError('User already exists with this email!', 400);
      }

      // Hash the password
      const hashedPassword = hashSync(password, 10);

      // Create the user in the database
      const newUser = await prisma.user.create({
        data: {
          email: finalEmail, // Use the final email
          password: hashedPassword,
          password_visible: password,
          name: finalName, // Use final name
          avatar:
            avatar ||
            'https://img.freepik.com/free-vector/illustration-businessman_53876-5856.jpg', // Default avatar if not provided
          role: role || 'MANAGER', // Default to "MANAGER" if role is not specified
          companyId: companyId, // Ensure companyId is properly linked
        },
      });

      console.log('New User created:', newUser);

      // Return the created user and companyId for response
      return { user: newUser, companyId };
    });

    // If everything is successful, send the response
    res.status(201).json({
      message: 'User and company created successfully!',
      user: result.user,
      companyId: result.companyId,
    });
  } catch (error) {
    console.log('Error ----> ', error);

    // Handle specific errors
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }

    next(error); // Pass any other errors to the error-handling middleware
  }
};

const Login = async (req, res, next) => {
  try {
    // Validate request body using Zod schema
    LoginUserSchema.parse(req.body);
    const { email, password } = req.body;

    // Check if the user exists and fetch associated company if necessary
    let user = await db.user.findFirst({
      where: { email },
      include: {
        company: true, // Include company details for non-admin users
      },
    });

    console.log(user);

    if (!user) {
      return next(new AppError('User does not exist!', 404));
    }

    // Check if the password is valid
    const isPasswordValid = await compare(password, user.password);
    if (!isPasswordValid) {
      return next(new AppError('Invalid credentials!', 401));
    }

    // If the user is not an admin, ensure they are associated with a company
    if (user.role !== 'ADMIN' && !user.companyId) {
      return next(new AppError('User is not associated with a company!', 403));
    }

    // Generate a JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
        companyId: user.companyId || null, // Company ID can be null for admins
      },
      process.env.JWT_SECRET
    );

    res.status(200).json({ status: 'success', user, token });
  } catch (error) {
    if (error instanceof z.ZodError) {
      // If Zod validation fails, respond with validation errors
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: error.errors,
      });
    }
    next(error);
  }
};

const GetAllUser = async (req, res, next) => {
  try {
    const { userId, role, companyId } = req.user;
    const { page = 1, limit = 10, searchTerm = '' } = req.query;

    console.log(req.user);

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = (pageNum - 1) * limitNum;

    let users, totalUsers;
    const searchConditions = searchTerm
      ? {
          OR: [
            { name: { contains: searchTerm } },
            { email: { contains: searchTerm } },
          ],
        }
      : {};

    switch (role) {
      case 'ADMIN':
        // Admin: Can see all users and include company details
        users = await db.user.findMany({
          where: {
            companyId: companyId, // Admin can see users in their company
            ...searchConditions,
          },
          skip: offset,
          take: limitNum,
          include: {
            company: true, // Include company details for users
          },
        });

        totalUsers = await db.user.count({
          where: {
            companyId: companyId,
            ...searchConditions,
          },
        });
        break;

      case 'SUBADMIN':
        // SUBADMIN: Can see users in their company
        users = await db.user.findMany({
          where: {
            companyId: companyId, // Filter users by companyId
            ...searchConditions,
          },
          skip: offset,
          take: limitNum,
          include: {
            company: true, // Include company details for users
          },
        });

        totalUsers = await db.user.count({
          where: {
            companyId: companyId, // Count users in their company
            ...searchConditions,
          },
        });
        break;

      case 'MANAGER':
        // Manager: Not allowed to view users
        return res.status(403).json({
          error: 'You do not have permission to view users.',
        });

      default:
        // Unauthorized role
        return res.status(403).json({
          error: 'Unauthorized role for accessing users.',
        });
    }

    return res.status(200).json({
      message: `${role} users retrieved successfully!`,
      users,
      total: totalUsers,
      page: pageNum,
      limit: limitNum,
    });
  } catch (error) {
    console.error('Error in getUsers:', error);
    next(error);
  }
};

const GetLoggedInUser = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    // Fetch the logged-in user's details from the database
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        company: true,
        branches: true,
        // Include company details if needed
      },
    });

    // Check if the user exists
    if (!user) {
      throw new AppError('User not found!', 404);
    }

    // Respond with the user's profile
    res.status(200).json({
      status: 'success',
      user,
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    next(new AppError('Failed to fetch user profile', 500));
  }
};

const UpdateUser = async (req, res, next) => {
  const { id } = req.params;
  const { email, password, name, avatar, role, companyId } = req.body;
  try {
    // Validate request body using Zod schema
    UpdateUserSchema.parse(req.body);

    // Find the user to be updated
    const existingUser = await db.user.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingUser) {
      throw new AppError('User not found!', 404);
    }

    // Check if the email is already taken by another user
    if (email && email !== existingUser.email) {
      const emailExists = await db.user.findUnique({
        where: { email },
      });

      if (emailExists) {
        throw new AppError('Email already in use by another user!', 400);
      }
    }

    // Hash the new password if provided
    let hashedPassword = existingUser.password;
    if (password) {
      hashedPassword = hashSync(password, 10);
    }

    // Check if the provided company exists (optional step if companyId is present)
    let company = null;
    if (companyId) {
      company = await db.companies.findUnique({
        where: { id: companyId },
      });

      if (!company) {
        throw new AppError('Company not found!', 404);
      }
    }

    // Update the user with the new data
    const updatedUser = await db.user.update({
      where: { id: parseInt(id) },
      data: {
        email: email || existingUser.email,
        password: hashedPassword,
        name: name || existingUser.name,
        avatar: avatar || existingUser.avatar,
        role: role || existingUser.role,
        companyId: companyId || existingUser.companyId, // Optional company assignment
      },
    });

    // Respond with success message and updated user data
    res.status(200).json({
      message: 'User updated successfully!',
      user: updatedUser,
    });
  } catch (error) {
    // Handle Zod validation errors
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

// TODO: Delete user api
const DeleteUser = async (req, res, next) => {
  const { id } = req.params;

  try {
    // Find the user to be deleted
    const existingUser = await db.user.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingUser) {
      throw new AppError('User not found!', 404);
    }

    // Delete the user
    await db.user.delete({
      where: { id: parseInt(id) },
    });

    res.status(200).json({
      message: 'User deleted successfully!',
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    next(new AppError('Failed to delete user', 500));
  }
};

const GetRecentUsers = async (req, res, next) => {
  try {
    const { role, companyId } = req.user;

    // Admin: Fetch all users, Subadmin: Fetch only users from their own company
    const whereCondition = role === 'ADMIN' ? {} : { companyId: companyId };

    // Fetch the last 5 users created, sorted by creation date (descending)
    const recentUsers = await db.user.findMany({
      where: whereCondition, // Use the appropriate condition based on the role
      orderBy: {
        created_at: 'desc', // Sort by creation date in descending order
      },
      take: 5,
      include: {
        company: true,
        branches: true, // Include company and branch details if needed
      },
    });

    res.json(recentUsers);
  } catch (error) {
    console.error('Error fetching recent users:', error);
    res
      .status(500)
      .json({ message: 'Error fetching recent users', error: error.message });
  }
};

const CreateFirstAdmin = async (req, res, next) => {
  try {
    const { email, password, name } = req.body;

    // Check if an Admin already exists
    const existingAdmin = await db.user.findFirst({
      where: { role: 'ADMIN' },
    });

    if (existingAdmin) {
      throw new AppError(
        'Admin already exists. Use an existing Admin to create new users.',
        400
      );
    }

    // Hash the password
    const hashedPassword = hashSync(password, 10);

    // Create the first Admin
    const firstAdmin = await db.user.create({
      data: {
        email,
        password: hashedPassword,
        password_visible: password, // Optional: consider removing in production
        name: name || 'Admin User',
        role: 'ADMIN',
        avatar:
          'https://img.freepik.com/free-vector/illustration-businessman_53876-5856.jpg', // Default avatar
      },
    });

    res.status(201).json({
      message: 'First Admin created successfully!',
      user: firstAdmin,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  CreateUser,
  Login,
  GetAllUser,
  GetLoggedInUser,
  UpdateUser,
  DeleteUser,
  GetRecentUsers,
  CreateFirstAdmin,
};
