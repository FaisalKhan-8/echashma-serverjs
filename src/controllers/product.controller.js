const { z } = require('zod');
const {
  CreateProductSchema,
  UpdateProductSchema,
} = require('../schema/product');
const db = require('../utils/db.config');

// Create a new product
const createProduct = async (req, res) => {
  const { name, code, branchIds } = req.body;
  const { userId } = req.user; // Assuming req.user contains the authenticated user's details

  try {
    // Check if a product with the same name or code already exists
    const existingProduct = await db.product.findFirst({
      where: {
        OR: [{ name }, { code }],
      },
    });

    if (existingProduct) {
      return res.status(400).json({
        error: 'Product with this name or code already exists',
      });
    }

    // Ensure branchIds are integers
    const branchIdsInt = branchIds.map((id) => parseInt(id, 10));

    // Validate the branchIds (ensure they exist and belong to the user)
    const branches = await db.branch.findMany({
      where: {
        id: { in: branchIdsInt }, // Ensure the provided branch IDs exist
        users: { some: { id: userId } }, // Ensure the branch is associated with the authenticated user
      },
    });

    // If any branch ID does not exist or does not belong to the user, return an error
    if (branches.length !== branchIdsInt.length) {
      return res.status(400).json({
        error:
          'One or more branch IDs are invalid or do not belong to the user',
      });
    }

    // Create the new product and associate it with the provided branches
    const newProduct = await db.product.create({
      data: {
        name,
        code,
        userId, // Associate product with the authenticated user
        branches: {
          connect: branchIdsInt.map((branchId) => ({ id: branchId })),
        },
      },
    });

    res.status(201).json(newProduct);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to create product' });
  }
};

// Get all products with pagination, search, and associated branches
const getAllProducts = async (req, res) => {
  const { userId } = req.user; // Get userId from authenticated user
  const { page = 1, limit = 10, search = '' } = req.query;
  const pageNumber = parseInt(page);
  const pageLimit = parseInt(limit);

  try {
    const products = await db.product.findMany({
      where: {
        userId, // Only fetch products created by this user
        name: {
          contains: search, // Search by product name
        },
      },
      skip: (pageNumber - 1) * pageLimit,
      take: pageLimit,
      include: {
        branches: true, // Include associated branches
      },
    });

    const totalProducts = await db.product.count({
      where: {
        userId, // Count only the user's products
        name: {
          contains: search,
        },
      },
    });

    res.status(200).json({
      totalProducts,
      totalPages: Math.ceil(totalProducts / pageLimit),
      currentPage: pageNumber,
      products,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to retrieve products' });
  }
};

// Get a single product by ID, including all associated details
const getProductById = async (req, res) => {
  const { id } = req.params;
  const { userId } = req.user; // Get userId from authenticated user

  try {
    const product = await db.product.findUnique({
      where: { id: Number(id), userId }, // Ensure product belongs to the user
      include: {
        branches: true, // Include associated branches
      },
    });

    if (!product) {
      return res
        .status(404)
        .json({ error: 'Product not found or not owned by user' });
    }

    res.status(200).json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to retrieve product' });
  }
};

// Update a product by ID, including associations with suppliers and branches
const updateProduct = async (req, res) => {
  const { id } = req.params;
  const { name, code } = req.body;
  const { userId } = req.user; // Get userId from authenticated user

  try {
    // Check if a product with the same name or code already exists
    const existingProduct = await db.product.findFirst({
      where: {
        OR: [{ name }, { code }],
        NOT: { id: Number(id) }, // Ensure the product being updated is not included in the check
      },
    });

    if (existingProduct) {
      return res.status(400).json({
        error: 'Product with this name or code already exists',
      });
    }

    // Update the product, ensuring it belongs to the authenticated user
    const updatedProduct = await db.product.update({
      where: { id: Number(id), userId }, // Ensure product belongs to the user
      data: {
        name,
        code,
      },
    });

    res.status(200).json(updatedProduct);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to update product' });
  }
};

// Delete a product by ID, removing associations with suppliers and branches
const deleteProduct = async (req, res) => {
  const { id } = req.params;
  const { userId } = req.user; // Get userId from authenticated user

  try {
    const product = await db.product.findUnique({
      where: { id: Number(id), userId }, // Ensure product belongs to the user
    });

    if (!product) {
      return res
        .status(404)
        .json({ error: 'Product not found or not owned by user' });
    }

    await db.product.delete({
      where: { id: Number(id), userId },
    });

    res.status(204).send(); // No content, successfully deleted
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to delete product' });
  }
};

const getProductsByUserBranches = async (
  userId,
  page = 1,
  pageSize = 10,
  searchTerm = ''
) => {
  try {
    const userWithBranches = await db.user.findUnique({
      where: { id: userId },
      include: {
        branches: {
          include: {
            products: {
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

    if (!userWithBranches) {
      throw new Error('User not found');
    }

    // Flatten the products from all branches
    const allProducts = userWithBranches.branches.flatMap(
      (branch) => branch.products
    );

    // Filter products if necessary
    const filteredProducts = allProducts.filter((product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalProducts = filteredProducts.length;
    const paginatedProducts = filteredProducts.slice(
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
    console.error('Error fetching products for user branches:', error);
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
