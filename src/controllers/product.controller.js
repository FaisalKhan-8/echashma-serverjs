const { z } = require("zod");
const { CreateProductSchema } = require("../schema/product");
const db = require("../utils/db.config");

// Create a new product
const createProduct = async (req, res) => {
  const {
    code,
    name,
    frameTypeId,
    shapeTypeId,
    visionTypeId,
    coatingTypeId,
    supplierIds,
    branchIds,
  } = req.body;

  try {
    // Validate the request body against the schema
    const parsedData = CreateProductSchema.parse({
      code,
      name,
      frameType: frameTypeId, // Use frameTypeId here
      shapeType: shapeTypeId, // Use shapeTypeId here
      visionType: visionTypeId, // Use visionTypeId here
      coatingType: coatingTypeId, // Use coatingTypeId here
      branchIds,
      supplierIds, // Include supplierIds for validation
    });

    // Proceed with product creation using parsedData
    const newProduct = await db.product.create({
      data: {
        code: parsedData.code,
        name: parsedData.name,
        frameTypeId: parsedData.frameType,
        shapeTypeId: parsedData.shapeType,
        visionTypeId: parsedData.visionType,
        coatingTypeId: parsedData.coatingType,
        suppliers: {
          connect: parsedData.supplierIds
            ? [{ id: parseInt(parsedData.supplierIds, 10) }]
            : [], // Connect existing suppliers
        },
        branches: {
          connect:
            parsedData.branchIds?.map((id) => ({ id: parseInt(id, 10) })) || [], // Connect existing branches
        },
      },
      include: {
        frameType: true,
        shapeType: true,
        visionType: true,
        coatingType: true,
        suppliers: true, // Include suppliers in the response
        branches: true, // Include branches in the response
      },
    });

    res.status(201).json(newProduct);
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Handle Zod validation errors
      return res.status(400).json({ errors: error.errors });
    }
    console.error(error);
    res.status(500).json({ error: "Unable to create product" });
  }
};

// Get all products with pagination, search, and associated branches
const getAllProducts = async (req, res) => {
  const { page = 1, limit = 10, search = "" } = req.query; // Get query parameters
  const pageNumber = parseInt(page);
  const pageLimit = parseInt(limit);

  try {
    const products = await db.product.findMany({
      where: {
        name: {
          contains: search, // Search for products by name
        },
      },
      skip: (pageNumber - 1) * pageLimit, // Skip to the right page
      take: pageLimit, // Limit the number of results
      include: {
        frameType: true,
        shapeType: true,
        visionType: true,
        coatingType: true,
        suppliers: true, // Include suppliers in the response
        branches: true, // Include branches in the response
      },
    });

    // Count total products for pagination
    const totalProducts = await db.product.count({
      where: {
        name: {
          contains: search,
        },
      },
    });

    res.status(200).json({
      totalProducts, // Total number of products matching search criteria
      totalPages: Math.ceil(totalProducts / pageLimit), // Total pages
      currentPage: pageNumber, // Current page
      products, // Current page products
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to retrieve products" });
  }
};

// Get a single product by ID, including all associated details
const getProductById = async (req, res) => {
  const { id } = req.params;

  try {
    const product = await db.product.findUnique({
      where: { id: Number(id) },
      include: {
        frameType: true,
        shapeType: true,
        visionType: true,
        coatingType: true,
        suppliers: true,
        branches: true, // Include branches in the response
      },
    });
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.status(200).json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to retrieve product" });
  }
};

// Update a product by ID, including associations with suppliers and branches
const updateProduct = async (req, res) => {
  const { id } = req.params;
  const {
    code,
    name,
    frameTypeId,
    shapeTypeId,
    visionTypeId,
    coatingTypeId,
    supplierIds,
    branchIds,
  } = req.body;

  try {
    const updatedProduct = await db.product.update({
      where: { id: Number(id) },
      data: {
        code,
        name,
        frameTypeId: parseInt(frameTypeId, 10), // Convert to integer
        shapeTypeId: parseInt(shapeTypeId, 10), // Convert to integer
        visionTypeId: parseInt(visionTypeId, 10), // Convert to integer
        coatingTypeId: parseInt(coatingTypeId, 10), // Convert to integer
        suppliers: {
          set: supplierIds.map((id) => ({ id: parseInt(id, 10) })), // Update suppliers
        },
        branches: {
          set: branchIds.map((id) => ({ id: parseInt(id, 10) })), // Update branches
        },
      },
      include: {
        frameType: true,
        shapeType: true,
        visionType: true,
        coatingType: true,
        suppliers: true,
        branches: true,
      },
    });
    res.status(200).json(updatedProduct);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to update product" });
  }
};

// Delete a product by ID, removing associations with suppliers and branches
const deleteProduct = async (req, res) => {
  const { id } = req.params;

  try {
    await db.product.delete({
      where: { id: Number(id) },
    });
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to delete product" });
  }
};

const getProductsByUserBranches = async (
  userId,
  page = 1,
  pageSize = 10,
  searchTerm = ""
) => {
  try {
    // Find the user and include only the branches and their products
    const userWithBranches = await db.user.findUnique({
      where: { id: userId },
      include: {
        branches: {
          include: {
            products: {
              include: {
                frameType: true,
                shapeType: true,
                visionType: true,
                coatingType: true,
              },
              where: {
                name: {
                  contains: searchTerm, // Search for products by name
                },
              },
            },
          },
        },
      },
    });

    // Extract products from the branches and flatten the array
    const products = userWithBranches
      ? userWithBranches.branches.flatMap((branch) => branch.products)
      : [];

    // Implement pagination
    const totalProducts = products.length;
    const paginatedProducts = products.slice(
      (page - 1) * pageSize,
      page * pageSize
    );

    return {
      products: paginatedProducts,
      totalProducts,
      totalPages: Math.ceil(totalProducts / pageSize),
      currentPage: page,
    };
  } catch (error) {
    console.error("Error fetching products for user branches:", error);
    throw error;
  }
};

// Export functions
module.exports = {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getProductsByUserBranches,
};
