const { z } = require('zod');

const db = require('../utils/db.config');
const { AppError } = require('../errors/AppError');

// Create a new product
const createProduct = async (req, res, next) => {
  const { name, code, negativeAllowed } = req.body; // ✅ added negativeAllow
  const { companyId: userCompanyId, role } = req.user;
  const { companyId: selectedCompanyId } = req.query;

  try {
    let companyId;

    if (role === 'SUPER_ADMIN') {
      if (selectedCompanyId) {
        companyId = Number(selectedCompanyId);
      } else {
        throw new AppError(
          'SUPER_ADMIN must provide a companyId when creating a product.',
          400
        );
      }
    } else {
      if (!userCompanyId) {
        throw new AppError(
          'No company associated with the user. Cannot create product.',
          400
        );
      }
      companyId = userCompanyId;
    }

    // Check for duplicates
    const existingProduct = await db.product.findFirst({
      where: {
        AND: [{ companyId }, { OR: [{ code }, { name }] }],
      },
    });

    if (existingProduct) {
      if (existingProduct.code === code) {
        throw new AppError('Product code already exists.', 409);
      }
      if (existingProduct.name === name) {
        throw new AppError('Product name already exists.', 409);
      }
    }

    // ✅ include negativeAllow in create
    const newProduct = await db.product.create({
      data: { name, code, negativeAllowed, companyId },
    });

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
  const { name, code, negativeAllowed } = req.body; // ✅ added negativeAllow
  const { companyId, role } = req.user;

  try {
    let companyIdToCheck;
    let currentProduct;

    // SUPER_ADMIN: find product and use its companyId
    if (role === 'SUPER_ADMIN') {
      currentProduct = await db.product.findUnique({
        where: { id: Number(id) },
      });

      if (!currentProduct) {
        throw new AppError('Product not found', 404);
      }
      companyIdToCheck = currentProduct.companyId;
    } else {
      companyIdToCheck = companyId;
    }

    // Check for duplicates (name or code)
    const existingProduct = await db.product.findFirst({
      where: {
        OR: [{ name }, { code }],
        companyId: companyIdToCheck,
        NOT: { id: Number(id) },
      },
    });

    if (existingProduct) {
      throw new AppError(
        'Product with this name or code already exists in the company',
        400
      );
    }

    // ✅ include negativeAllow in update
    let updatedProduct;
    if (role === 'SUPER_ADMIN') {
      updatedProduct = await db.product.update({
        where: { id: Number(id) },
        data: { name, code, negativeAllowed },
      });
    } else {
      updatedProduct = await db.product.update({
        where: { id: Number(id), companyId },
        data: { name, code, negativeAllowed },
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
