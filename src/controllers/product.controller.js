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
    supplierIds, // Array of supplier IDs to associate with the product
  } = req.body;

  try {
    const newProduct = await db.product.create({
      data: {
        code,
        name,
        frameTypeId,
        shapeTypeId,
        visionTypeId,
        coatingTypeId,
        suppliers: {
          connect: supplierIds.map((id) => ({ id })), // Connect existing suppliers
        },
      },
      include: {
        frameType: true,
        shapeType: true,
        visionType: true,
        coatingType: true,
        suppliers: true, // Include suppliers in the response
      },
    });
    res.status(201).json(newProduct);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to create product" });
  }
};

// Get all products with pagination and search
const getAllProducts = async (req, res) => {
  const { page = 1, limit = 10, search = "" } = req.query; // Get query parameters
  const pageNumber = parseInt(page);
  const pageLimit = parseInt(limit);

  try {
    const products = await db.product.findMany({
      where: {
        // Search condition
        name: {
          contains: search, // Search for products by name
          mode: "insensitive", // Case-insensitive search
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
      },
    });

    // Count total products for pagination
    const totalProducts = await db.product.count({
      where: {
        name: {
          contains: search,
          mode: "insensitive",
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

// Get a single product by ID
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

// Update a product by ID
const updateProduct = async (req, res) => {
  const { id } = req.params;
  const { code, name, frameTypeId, shapeTypeId, visionTypeId, coatingTypeId } =
    req.body;

  try {
    const updatedProduct = await db.product.update({
      where: { id: Number(id) },
      data: {
        code,
        name,
        frameTypeId,
        shapeTypeId,
        visionTypeId,
        coatingTypeId,
      },
    });
    res.status(200).json(updatedProduct);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to update product" });
  }
};

// Delete a product by ID
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

// Export functions
module.exports = {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
};
