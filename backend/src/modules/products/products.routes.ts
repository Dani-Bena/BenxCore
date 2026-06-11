import { Router } from "express";
import {
  authMiddleware,
  type AuthenticatedRequest,
} from "../../middleware/auth.middleware.js";
import { getAuthContext, parseId } from "../../utils/http.js";
import { createProductSchema, updateProductSchema } from "./products.schemas.js";
import {
  createProduct,
  deactivateProduct,
  getProductById,
  listProducts,
  updateProduct,
} from "./products.service.js";

export const productsRouter = Router();

productsRouter.use(authMiddleware);

function parseProductType(type: unknown): "PRODUCT" | "SERVICE" | undefined {
  if (type === "PRODUCT" || type === "SERVICE") {
    return type;
  }

  return undefined;
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

  const includeInactive = req.query.includeInactive === "true";
  const type = parseProductType(req.query.type);

  const products = await listProducts(context, {
    includeInactive,
    type,
  });

  res.json({
    products,
  });
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

  const product = await getProductById(context, { productId });

  res.json({
    product,
  });
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

  const product = await createProduct(context, result.data);

  res.status(201).json({
    product,
  });
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

  const product = await updateProduct(context, { productId }, result.data);

  res.json({
    product,
  });
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

  const product = await deactivateProduct(context, { productId });

  res.json({
    message: "Product deactivated successfully",
    product,
  });
});
