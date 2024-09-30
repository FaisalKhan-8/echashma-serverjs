const db = require("../utils/db.config");
const { CreateProductSchema } = require("../schema/product"); // Adjust the import based on your file structure

const addProduct = async (req, res) => {
  try {
    // Validate the request body against the schema
    const validatedData = CreateProductSchema.parse(req.body); // Validate and destructure

    // Destructure required fields from validated data
    const {
      code,
      name,
      frameType,
      shapeType,
      visionType,
      coatingType,
      branchIds, // array of branch IDs where this product is available
    } = validatedData;

    // Validation checks for required fields
    if (!branchIds || branchIds.length === 0) {
      return res.status(400).json({
        error: "At least one branch must be selected.",
      });
    }

    // Validate that all branch IDs exist in the database
    const validBranches = await db.branch.findMany({
      where: {
        id: { in: branchIds },
      },
    });

    // If the number of valid branches is less than the number of provided branchIds, return an error
    if (validBranches.length !== branchIds.length) {
      return res.status(404).json({
        error: "Some branches could not be found. Please check the branch IDs.",
      });
    }

    // Create a new product with relation to branches
    const newProduct = await db.product.create({
      data: {
        code,
        name,
        frameType,
        shapeType,
        visionType,
        coatingType,
        branches: {
          connect: branchIds.map((branchId) => ({ id: branchId })),
        },
      },
      include: {
        branches: true, // Include related branches in the response
      },
    });

    // Return the newly created product with related branches
    return res.status(201).json(newProduct);
  } catch (error) {
    // Handle validation errors from Zod
    if (error instanceof ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Error adding product:", error);
    return res
      .status(500)
      .json({ error: "Something went wrong while adding the product." });
  }
};

const getAllProductsByType = async (req, res) => {
  const { type, search, page = 1, limit = 10 } = req.query;

  // Validate the type parameter
  if (!type) {
    return res.status(400).json({
      error: "Type parameter is required.",
    });
  }

  // Create a valid query based on the provided type
  let query = {};
  switch (type) {
    case "frameType":
      query.frameType = { not: undefined }; // Select all products with any frameType
      break;
    case "shapeType":
      query.shapeType = { not: undefined }; // Select all products with any shapeType
      break;
    case "visionType":
      query.visionType = { not: undefined }; // Select all products with any visionType
      break;
    case "coatingType":
      query.coatingType = { not: undefined }; // Select all products with any coatingType
      break;
    default:
      return res.status(400).json({
        error: "Invalid product type specified.",
      });
  }

  // If a search term is provided, add it to the query
  if (search) {
    query.name = { contains: search, mode: "insensitive" }; // Case insensitive search
  }

  try {
    // Fetch total count of products matching the query (for pagination)
    const totalCount = await db.product.count({
      where: query,
    });

    // Calculate total pages
    const totalPages = Math.ceil(totalCount / limit);

    // Fetch paginated products matching the query
    const products = await db.product.findMany({
      where: query,
      include: {
        branches: true, // Include related branches if needed
      },
      skip: (page - 1) * limit, // Skip the records for pagination
      take: parseInt(limit, 10), // Limit the number of records returned
    });

    // If no products are found, return a 404 response
    if (products.length === 0) {
      return res
        .status(404)
        .json({ message: "No products found for the specified type." });
    }

    // Return the found products and pagination info
    return res.status(200).json({
      products,
      pagination: {
        totalCount,
        totalPages,
        currentPage: parseInt(page, 10),
        pageSize: parseInt(limit, 10),
      },
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return res
      .status(500)
      .json({ error: "Something went wrong while fetching products." });
  }
};

module.exports = {
  addProduct,
  getAllProductsByType,
};
