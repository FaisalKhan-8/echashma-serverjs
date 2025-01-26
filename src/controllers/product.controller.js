const { z } = require('zod');

const db = require('../utils/db.config');
const { AppError } = require('../errors/AppError');

// Create a new product
const createProduct = async (req, res, next) => {
  const { name, code } = req.body;
  const { companyId: userCompanyId, role } = req.user;
  const { companyId: selectedCompanyId } = req.query;

  try {
    let companyId;

    // If the user is SUPER_ADMIN, they can pass the companyId via the query params
    if (role === 'SUPER_ADMIN') {
      if (selectedCompanyId) {
        // If SUPER_ADMIN passes a companyId in the query params, use that
        companyId = Number(selectedCompanyId); // Ensure companyId is a number
      } else {
        // If no companyId is provided by SUPER_ADMIN, return an error
        throw new AppError(
          'SUPER_ADMIN must provide a companyId when creating a product.',
          400
        );
      }
    } else {
      // For non-SUPER_ADMIN users (like ADMIN), use the companyId from the token
      if (!userCompanyId) {
        throw new AppError(
          'No company associated with the user. Cannot create product.',
          400
        );
      }
      companyId = userCompanyId;
    }

    // Step 1: Check if a product with the same name already exists for the given company
    const existingProduct = await db.product.findFirst({
      where: {
        AND: [{ companyId }, { OR: [{ code }, { name }] }],
      },
    });

    console.log(existingProduct, 'product already');

    if (existingProduct) {
      if (existingProduct.code === code) {
        throw new AppError('Product code already exists.', 409);
      }
      if (existingProduct.name === name) {
        throw new AppError('Product name already exists.', 409);
      }
    }

    // Step 3: Create the new product for the correct company
    const newProduct = await db.product.create({
      data: { name, code, companyId },
    });

    // Step 4: Respond with the newly created product
    res.status(201).json(newProduct);
  } catch (error) {
    console.error(error);
    next(error);
  }
};

// Get all products with pagination, search, and associated branches
const getAllProducts = async (req, res) => {
  const { userId, companyId: userCompanyId, role } = req.user; // Get userId, companyId, and role from the authenticated user
  const {
    page = 1,
    limit = 10,
    search = '',
    companyId: queryCompanyId,
  } = req.query; // Extract query params
  const pageNumber = parseInt(page);
  const pageLimit = parseInt(limit);

  try {
    // Initialize the 'where' clause for filtering by product name
    let whereClause = {
      name: {
        contains: search, // Search by product name
        mode: 'insensitive', // Case-insensitive search
      },
    };

    // If the user is a SUPER_ADMIN, they can filter by companyId from the query
    if (role === 'SUPER_ADMIN') {
      if (queryCompanyId) {
        whereClause.companyId = parseInt(queryCompanyId, 10) || undefined; // Filter products by companyId from query
      }
    } else {
      // For other roles, restrict access to the user's company
      if (!userCompanyId) {
        throw new Error('No company associated with the user.');
      }
      whereClause.companyId = userCompanyId; // Filter products by the user's companyId
    }

    // Fetch products based on the dynamically constructed whereClause
    const products = await db.product.findMany({
      where: whereClause,
      skip: (pageNumber - 1) * pageLimit,
      take: pageLimit,
      include: {
        Company: true, // Include company information in the response
      },
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
const updateProduct = async (req, res, next) => {
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
      throw new AppError('Product with this name or code already exists', 400);
    }

    // Admin users can update any product; others can only update their own products
    let updatedProduct;

    if (role === 'SUPER_ADMIN') {
      const superAdminProductCheck = await db.product.findFirst({
        where: {
          OR: [{ name }, { code }],
          companyId: existingProduct.companyId,
          NOT: { id: Number(id) }, // Ensure the product being updated is not included in the check
        },
      });

      if (superAdminProductCheck) {
        throw new AppError('Product with this name or code already exist', 403);
      }

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
    next(error);
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
    if (role === 'SUPER_ADMIN') {
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
