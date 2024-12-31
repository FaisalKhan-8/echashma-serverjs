const { z } = require('zod');

const db = require('../utils/db.config');
const { AppError } = require('../errors/AppError');

// Create a new product
const createProduct = async (req, res, next) => {
  const { name, code } = req.body;
  const { companyId } = req.user; // Assuming req.user contains the authenticated user's details

  try {
    // Check if a product with the same name or code already exists within the same company
    const existingProduct = await db.product.findFirst({
      where: {
        OR: [{ name }, { code }],
        companyId: companyId, // Ensure the product is being created under the correct company
      },
    });

    if (existingProduct) {
      return next(
        new AppError(
          'Product with this name or code already exists in this company!',
          409
        )
      );
    }

    // Create the new product and associate it with the provided company
    const newProduct = await db.product.create({
      data: {
        name,
        code,
        companyId, // Associate product with the authenticated user's company
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
  const { userId, companyId, role } = req.user; // Get userId, companyId, and role from the authenticated user
  const { page = 1, limit = 10, search = '' } = req.query;
  const pageNumber = parseInt(page);
  const pageLimit = parseInt(limit);

  try {
    let whereClause = {
      name: {
        contains: search, // Search by product name
      },
    };

    // If the user is not an admin, filter by userId and companyId
    if (role !== 'ADMIN') {
      whereClause = {
        ...whereClause,
        companyId, // Only fetch products for the user's company
      };
    }

    // Fetch products based on the dynamically constructed whereClause
    const products = await db.product.findMany({
      where: whereClause,
      skip: (pageNumber - 1) * pageLimit,
      take: pageLimit,
    });

    // Get total products count for pagination
    const totalProducts = await db.product.count({
      where: whereClause, // Same filtering condition as above
    });

    // Return products and pagination info
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
  const { companyId, role } = req.user; // Get userId, companyId, and role from authenticated user

  try {
    // Check if a product with the same name or code already exists, excluding the product being updated
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

    // Admin users can update any product; others can only update their own products
    let updatedProduct;

    if (role === 'ADMIN') {
      // Admin: can update any product
      updatedProduct = await db.product.update({
        where: { id: Number(id) },
        data: { name, code },
      });
    } else {
      // Non-admin users: can only update their own products within their company
      updatedProduct = await db.product.update({
        where: {
          id: Number(id),
          companyId, // Ensure the product belongs to the authenticated user's company
        },
        data: { name, code },
      });
    }

    res.status(200).json(updatedProduct);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to update product' });
  }
};

// Delete a product by ID, removing associations with suppliers and branches
const deleteProduct = async (req, res) => {
  const { id } = req.params;
  const { companyId, role } = req.user; // Get companyId and role from authenticated user

  console.log(id);
  console.log(companyId);
  console.log(role);

  try {
    // If the user is an ADMIN, they can delete any product
    if (role === 'ADMIN') {
      const product = await db.product.findUnique({
        where: { id: Number(id) },
      });

      console.log(product);

      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      // Delete the product
      await db.product.delete({
        where: { id: Number(id) },
      });

      return res.status(204).send(); // No content, successfully deleted
    }

    // If the user is SUBADMIN or MANAGER, they can only delete their own company's product
    const product = await db.product.findUnique({
      where: { id: Number(id), companyId }, // Ensure product belongs to the user's company
    });

    if (!product) {
      return res.status(404).json({
        error: "Product not found or not owned by the user's company",
      });
    }

    // Delete the product
    await db.product.delete({
      where: { id: Number(id), companyId },
    });

    return res.status(204).send(); // No content, successfully deleted
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Unable to delete product' });
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
