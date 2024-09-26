const { AppError } = require("../errors/AppError.js");
const { CreateBranchSchema } = require("../schema/branch.js");
const db = require("../utils/db.config.js");

const createBranch = async (req, res, next) => {
  try {
    // Validate request body
    const parsedBody = CreateBranchSchema.parse(req.body);

    const { branchName, address, contactPerson, phone, email, companyId } =
      parsedBody;

    // Check if the company exists
    const existingCompany = await db.companies.findUnique({
      where: { id: companyId },
    });

    if (!existingCompany) {
      throw new AppError("Company not found!", 404);
    }

    // Create the new branch in the database
    const newBranch = await db.branch.create({
      data: {
        branchName,
        address,
        contactPerson,
        phone,
        email,
        company: {
          connect: { id: companyId }, // Associate with the existing company
        },
      },
    });

    // Return a successful response
    res.status(201).json({
      message: "Branch created successfully!",
      branch: newBranch,
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

module.exports = {
  createBranch,
};
