const db = require("../utils/db.config.js");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { CreateUserSchema, LoginUserSchema } = require("../schema/user.js");
const { AppError } = require("../errors/AppError.js");
const { z } = require("zod");

const { hashSync, compare } = bcrypt;

const CreateUser = async (req, res, next) => {
  try {
    // Validate request body using Zod schema
    CreateUserSchema.parse(req.body);

    const { email, password, name, avatar, role, companyId } = req.body;

    // Check if the user already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new AppError("User already exists!", 400);
    }

    // Hash the password
    const hashedPassword = hashSync(password, 10);

    // Check if the provided company exists (optional step if companyId is present)
    let company = null;
    if (companyId) {
      company = await db.companies.findUnique({
        where: { id: companyId },
      });

      if (!company) {
        throw new AppError("Company not found!", 404);
      }
    }

    // Create the new user with optional company assignment
    const newUser = await db.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        avatar,
        role: role || "SUBADMIN", // Default to 'SUBADMIN' if no role is provided
        companyId: companyId || null, // Optional company assignment
      },
      include: {
        company: true, // Include company details in the response
      },
    });

    // Respond with success message and user data
    res.status(201).json({
      message: "User created successfully!",
      user: newUser,
    });
  } catch (error) {
    // Handle Zod validation errors
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

const Login = async (req, res, next) => {
  try {
    // Validate request body using Zod schema
    LoginUserSchema.parse(req.body);
    const { email, password } = req.body;

    // Check if the user exists and the password is correct
    let user = await db.user.findFirst({
      where: { email },
      include: {
        company: true, // Include company details in the response
      },
    });

    if (!user) {
      return next(new AppError("User does not exist!", 404));
    }

    const isPasswordValid = await compare(password, user.password);
    if (!isPasswordValid) {
      return next(new AppError("Invalid credentials!", 401));
    }

    const token = jwt.sign(
      {
        userId: user.id,
      },

      process.env.JWT_SECRET
    );

    res.status(200).json({ status: "success", user, token });
  } catch (error) {
    if (error instanceof z.ZodError) {
      // If Zod validation fails, respond with validation errors
      return res.status(400).json({
        status: "error",
        message: "Validation failed",
        errors: error.errors,
      });
    }
    next(error);
  }
};

module.exports = {
  CreateUser,
  Login,
};
