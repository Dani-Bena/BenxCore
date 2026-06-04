import { Router } from "express";
import {
  authMiddleware,
  type AuthenticatedRequest,
} from "../../middleware/auth.middleware.js";
import { createProductSchema, updateProductSchema } from "./products.schemas.js";
import {
  ProductServiceError,
  createProduct,
  deactivateProduct,
  getProductById,
  listProducts,
  updateProduct,
} from "./products.service.js";

export const productsRouter = Router();

productsRouter.use(authMiddleware);

function getCompanyId(req: AuthenticatedRequest): number | null {
  return req.auth?.companyId ?? null;
}

function getUserId(req: AuthenticatedRequest): number | null {
  return req.auth?.userId ?? null;
}

function parseId(id: string | undefined): number | null {
  if (!id) return null;

  const parsedId = Number(id);

  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    return null;
  }

  return parsedId;
}

function getAuthContext(req: AuthenticatedRequest) {
  const companyId = getCompanyId(req);

  if (!companyId) {
    return null;
  }

  return {
    companyId,
    userId: getUserId(req),
  };
}

function parseProductType(type: unknown): "PRODUCT" | "SERVICE" | undefined {
  if (type === "PRODUCT" || type === "SERVICE") {
    return type;
  }

  return undefined;
}

function handleServiceError(error: unknown, res: any) {
  if (error instanceof ProductServiceError) {
    res.status(error.statusCode).json({
      message: error.message,
    });
    return;
  }

  console.error(error);

  res.status(500).json({
    message: "Internal server error",
  });
}

productsRouter.get("/", async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const context = getAuthContext(authReq);

  if (!context) {
    res.status(401).json({
      message: "User has no company assigned",
    });
    return;
  }

  try {
    const includeInactive = req.query.includeInactive === "true";
    const type = parseProductType(req.query.type);

    const products = await listProducts(context, {
      includeInactive,
      type,
    });

    res.json({
      products,
    });
  } catch (error) {
    handleServiceError(error, res);
  }
});

productsRouter.get("/:id", async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const context = getAuthContext(authReq);
  const productId = parseId(req.params.id);

  if (!context) {
    res.status(401).json({
      message: "User has no company assigned",
    });
    return;
  }

  if (!productId) {
    res.status(400).json({
      message: "Invalid product id",
    });
    return;
  }

  try {
    const product = await getProductById(context, { productId });

    res.json({
      product,
    });
  } catch (error) {
    handleServiceError(error, res);
  }
});

productsRouter.post("/", async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const context = getAuthContext(authReq);

  if (!context) {
    res.status(401).json({
      message: "User has no company assigned",
    });
    return;
  }

  const result = createProductSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      message: "Invalid request data",
      errors: result.error.flatten(),
    });
    return;
  }

  try {
    const product = await createProduct(context, result.data);

    res.status(201).json({
      product,
    });
  } catch (error) {
    handleServiceError(error, res);
  }
});

productsRouter.put("/:id", async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const context = getAuthContext(authReq);
  const productId = parseId(req.params.id);

  if (!context) {
    res.status(401).json({
      message: "User has no company assigned",
    });
    return;
  }

  if (!productId) {
    res.status(400).json({
      message: "Invalid product id",
    });
    return;
  }

  const result = updateProductSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      message: "Invalid request data",
      errors: result.error.flatten(),
    });
    return;
  }

  try {
    const product = await updateProduct(context, { productId }, result.data);

    res.json({
      product,
    });
  } catch (error) {
    handleServiceError(error, res);
  }
});

productsRouter.delete("/:id", async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const context = getAuthContext(authReq);
  const productId = parseId(req.params.id);

  if (!context) {
    res.status(401).json({
      message: "User has no company assigned",
    });
    return;
  }

  if (!productId) {
    res.status(400).json({
      message: "Invalid product id",
    });
    return;
  }

  try {
    const product = await deactivateProduct(context, { productId });

    res.json({
      message: "Product deactivated successfully",
      product,
    });
  } catch (error) {
    handleServiceError(error, res);
  }
});