const { AppError } = require('../errors/AppError');
const db = require('../utils/db.config');

// const getStock = async (req, res, next) => {
//   const { companyId, branchId: userBranchId, role } = req.user;
//   const { branchId: queryBranchId } = req.query;
//   const { productId, brandId, modalNo, frameTypeId, shapeTypeId } = req.body;

//   try {
//     // Validate required parameters
//     if (!productId) {
//       throw new AppError('Product ID is required', 400);
//     }

//     // Validate productId format
//     const parsedProductId = parseInt(productId, 10);
//     if (isNaN(parsedProductId)) {
//       throw new AppError('Invalid Product ID format', 400);
//     }

//     // Branch ID resolution and validation
//     let branchId;
//     switch (role) {
//       case 'MANAGER':
//         branchId = parseInt(userBranchId, 10);
//         if (isNaN(branchId)) {
//           throw new AppError('Invalid manager branch ID', 400);
//         }
//         break;

//       case 'SUPER_ADMIN':
//       case 'ADMIN':
//       case 'SUBADMIN':
//         if (!queryBranchId) {
//           throw new AppError('Branch ID query parameter is required', 400);
//         }
//         branchId = parseInt(queryBranchId, 10);
//         if (isNaN(branchId)) {
//           throw new AppError('Invalid branch ID format', 400);
//         }
//         break;

//       default:
//         throw new AppError('Unauthorized access for this role', 403);
//     }

//     // Main logic
//     if (brandId && frameTypeId && shapeTypeId) {
//       // Validate numeric parameters
//       const numericParams = {
//         brandId: parseInt(brandId, 10),
//         frameTypeId: parseInt(frameTypeId, 10),
//         shapeTypeId: parseInt(shapeTypeId, 10),
//       };

//       for (const [param, value] of Object.entries(numericParams)) {
//         if (isNaN(value)) {
//           throw new AppError(`Invalid ${param} format`, 400);
//         }
//       }

//       const inventory = await db.inventory.findFirst({
//         where: {
//           productId: parsedProductId,
//           ...numericParams,
//           companyId,
//           branchId,
//           ...(modalNo && { modalNo }),
//         },
//         select: { stock: true, price: true, modalNo: true },
//       });

//       return res.json({
//         stock: inventory?.stock || 0,
//         price: inventory?.price ?? null,
//         modalNo: inventory?.modalNo ?? null,
//       });
//     }

//     // find first

//     // MODE A: Aggregation mode
//     const inventoryRecords = await db.inventory.findMany({
//       where: {
//         productId: parsedProductId,
//         companyId,
//         branchId,
//         stock: { gt: 0 }, // Only consider items with stock
//       },
//       distinct: ['frameTypeId', 'shapeTypeId', 'brandId'],
//       include: {
//         frameType: { select: { id: true, name: true } },
//         shapeType: { select: { id: true, name: true } },
//         brands: { select: { id: true, name: true } },
//       },
//     });

//     if (inventoryRecords.length === 0) {
//       throw new AppError('No inventory found for this product', 404);
//     }

//     // Map results using reduce for better performance
//     const result = inventoryRecords.reduce(
//       (acc, curr) => {
//         if (curr.frameType) acc.frameTypes.add(curr.frameType);
//         if (curr.shapeType) acc.shapeTypes.add(curr.shapeType);
//         if (curr.brands) acc.brands.add(curr.brands);
//         return acc;
//       },
//       {
//         frameTypes: new Set(),
//         shapeTypes: new Set(),
//         brands: new Set(),
//       }
//     );

//     res.json({
//       productId: parsedProductId,
//       frameTypes: Array.from(result.frameTypes),
//       shapeTypes: Array.from(result.shapeTypes),
//       brands: Array.from(result.brands),
//     });
//   } catch (error) {
//     console.error('Stock check failed:', error);
//     next(
//       error instanceof AppError
//         ? error
//         : new AppError('Failed to retrieve stock information', 500)
//     );
//   }
// };

const getStock = async (req, res, next) => {
  const { companyId, branchId: userBranchId, role } = req.user;
  const { branchId: queryBranchId } = req.query;
  const { productId, brandId, modalNo, frameTypeId } = req.body;

  try {
    if (!productId) throw new AppError('Product ID is required', 400);

    const parsedProductId = parseInt(productId, 10);
    if (isNaN(parsedProductId))
      throw new AppError('Invalid Product ID format', 400);

    // Branch ID resolution
    let branchId;
    switch (role) {
      case 'MANAGER':
        branchId = parseInt(userBranchId, 10);
        break;
      case 'SUPER_ADMIN':
      case 'ADMIN':
      case 'SUBADMIN':
        if (!queryBranchId)
          throw new AppError('Branch ID query parameter is required', 400);
        branchId = parseInt(queryBranchId, 10);
        break;
      default:
        throw new AppError('Unauthorized access for this role', 403);
    }
    if (isNaN(branchId)) throw new AppError('Invalid branch ID format', 400);

    // ✅ Check branch negativeBilling flag
    const branch = await db.branch.findUnique({
      where: { id: branchId },
      select: { negativeBilling: true },
    });
    const allowNegative = branch?.negativeBilling ?? false;

    // Specific item lookup
    if (brandId && frameTypeId) {
      const numericParams = {
        brandId: parseInt(brandId, 10),
        frameTypeId: parseInt(frameTypeId, 10),
      };
      for (const [param, value] of Object.entries(numericParams)) {
        if (isNaN(value)) throw new AppError(`Invalid ${param} format`, 400);
      }

      const inventory = await db.inventory.findFirst({
        where: {
          productId: parsedProductId,
          ...numericParams,
          companyId,
          branchId,
          ...(modalNo && { modalNo }),
        },
        select: { stock: true, price: true, modalNo: true },
      });

      // ✅ if negativeBilling false, ensure stock > 0
      if (!allowNegative && (!inventory || inventory.stock <= 0)) {
        return res.json({ stock: 0, price: null, modalNo: null });
      }

      return res.json({
        stock: inventory?.stock || 0,
        price: inventory?.price ?? null,
        modalNo: inventory?.modalNo ?? null,
      });
    }

    // Aggregation mode
    const inventoryRecords = await db.inventory.findMany({
      where: {
        productId: parsedProductId,
        companyId,
        branchId,
        ...(allowNegative ? {} : { stock: { gt: 0 } }), // ✅ allow or restrict
      },
      distinct: ['frameTypeId', 'brandId'],
      include: {
        frameType: { select: { id: true, name: true } },
        brands: { select: { id: true, name: true } },
      },
    });

    if (inventoryRecords.length === 0) {
      throw new AppError('No inventory found for this product', 404);
    }

    const deduplicate = (arr) => {
      const seen = new Set();
      return arr.filter((item) => {
        const key = `${item.id}:${item.name}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    };

    res.json({
      productId: parsedProductId,
      frameTypes: deduplicate(
        inventoryRecords.map((i) => i.frameType).filter(Boolean)
      ),
      brands: deduplicate(
        inventoryRecords.map((i) => i.brands).filter(Boolean)
      ),
    });
  } catch (error) {
    console.error('Stock check failed:', error);
    next(
      error instanceof AppError
        ? error
        : new AppError('Failed to retrieve stock information', 500)
    );
  }
};

const getProductDetails = async (req, res, next) => {
  const { companyId, branchId: userBranchId, role } = req.user;
  const { branchId: queryBranchId } = req.query;
  const { productId } = req.body;

  try {
    if (!productId) {
      throw new AppError('Product ID is required', 400);
    }

    // Determine branch ID based on user role
    let branchId;
    if (role === 'MANAGER') {
      branchId = parseInt(userBranchId, 10);
    } else if (['SUPER_ADMIN', 'ADMIN', 'SUBADMIN'].includes(role)) {
      if (!queryBranchId) {
        throw new AppError('Branch ID is required', 400);
      }
      branchId = parseInt(queryBranchId, 10);
    } else {
      throw new AppError('Unauthorized role', 403);
    }

    if (!branchId || isNaN(branchId)) {
      throw new AppError('Invalid branch ID', 400);
    }

    // Fetch the product with ALL matching Inventory rows for the given branch and company.
    // Each inventory row includes its own frameType, shapeType, and brands (brand)
    const product = await db.product.findUnique({
      where: { id: parseInt(productId, 10) },
      include: {
        Inventory: {
          where: { branchId, companyId },
          include: {
            frameType: true,
            // shapeType: true,
            brands: true,
          },
        },
      },
    });

    if (!product) {
      throw new AppError('Product not found', 404);
    }

    // Map through ALL Inventory rows to build inventory details.
    const inventoryDetails = product.Inventory.map((inv) => ({
      stock: inv.stock,
      price: inv.price,
      frameType: inv.frameType
        ? { id: inv.frameType.id, name: inv.frameType.name }
        : null,
      // shapeType: inv.shapeType
      //   ? { id: inv.shapeType.id, name: inv.shapeType.name }
      //   : null,
      brand: inv.brands ? { id: inv.brands.id, name: inv.brands.name } : null,
    }));

    // Aggregate distinct frame types, shape types, and brands from the inventory details.
    const frameTypeMap = {};
    // const shapeTypeMap = {};
    const brandMap = {};

    inventoryDetails.forEach((item) => {
      if (item.frameType && !frameTypeMap[item.frameType.id]) {
        frameTypeMap[item.frameType.id] = item.frameType;
      }
      // if (item.shapeType && !shapeTypeMap[item.shapeType.id]) {
      //   shapeTypeMap[item.shapeType.id] = item.shapeType;
      // }
      if (item.brand && !brandMap[item.brand.id]) {
        brandMap[item.brand.id] = item.brand;
      }
    });

    const frameTypes = Object.values(frameTypeMap);
    // const shapeTypes = Object.values(shapeTypeMap);
    const brands = Object.values(brandMap);

    // Prepare the final response with aggregated arrays
    const response = {
      productId: product.id,
      code: product.code,
      name: product.name,
      frameTypes, // All distinct frame types
      // shapeTypes, // All distinct shape types
      brands, // All distinct brands
      inventory: inventoryDetails, // Full inventory details (optional)
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching product details:', error);
    next(error);
  }
};

const getInventoryProducts = async (req, res, next) => {
  const { companyId, branchId: userBranchId, role } = req.user;
  const { branchId: queryBranchId, search, page } = req.query;

  try {
    // Resolve branch ID based on user role
    let branchId;
    switch (role) {
      case 'MANAGER':
        branchId = parseInt(userBranchId, 10);
        if (isNaN(branchId)) {
          throw new AppError('Invalid manager branch ID', 400);
        }
        break;
      case 'SUPER_ADMIN':
      case 'ADMIN':
      case 'SUBADMIN':
        if (!queryBranchId) {
          throw new AppError('Branch ID query parameter is required', 400);
        }
        branchId = parseInt(queryBranchId, 10);
        if (isNaN(branchId)) {
          throw new AppError('Invalid branch ID format', 400);
        }
        break;
      default:
        throw new AppError('Unauthorized access for this role', 403);
    }

    // Set up pagination variables
    const currentPage = parseInt(page, 10) || 1;
    const limit = 10;
    const skip = (currentPage - 1) * limit;

    // First, get distinct product IDs from the inventory for the company and branch
    const inventoryProducts = await db.inventory.findMany({
      where: { companyId, branchId },
      distinct: ['productId'],
      select: { productId: true },
    });

    const productIds = inventoryProducts.map((inv) => inv.productId);
    if (productIds.length === 0) {
      throw new AppError('No products found in inventory', 404);
    }

    // Build a filter for the Product table based on search if provided
    const productFilter = {
      id: { in: productIds },
      ...(search && { name: { contains: search } }),
    };

    // Optional: Get total count for pagination info
    const total = await db.product.count({ where: productFilter });

    // Now, retrieve products with only the id and name fields
    const products = await db.product.findMany({
      where: productFilter,
      select: { id: true, name: true },
      skip,
      take: limit,
    });

    if (products.length === 0) {
      throw new AppError('No products found matching the criteria', 404);
    }

    res.json({
      data: products,
      total,
      page: currentPage,
      limit,
    });
  } catch (error) {
    console.error('Failed to retrieve inventory products:', error);
    next(
      error instanceof AppError
        ? error
        : new AppError('Failed to retrieve inventory products', 500)
    );
  }
};

module.exports = { getStock, getProductDetails, getInventoryProducts };
