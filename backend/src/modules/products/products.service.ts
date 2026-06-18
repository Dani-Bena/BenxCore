import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/errors.js";
import type {
  CreateProductInput,
  UpdateProductInput,
} from "./products.schemas.js";

type ServiceContext = {
  companyId: number;
  userId: number | null;
};

type ProductIdInput = {
  productId: number;
};

export class ProductServiceError extends AppError {}

function toAuditJson(value: unknown) {
  return JSON.parse(JSON.stringify(value));
}

export async function listProducts(
  context: ServiceContext,
  options: {
    includeInactive?: boolean;
    type?: "PRODUCT" | "SERVICE";
  } = {}
) {
  const { companyId } = context;
  const { includeInactive = false, type } = options;

  return prisma.product.findMany({
    where: {
      companyId,
      ...(includeInactive ? {} : { active: true }),
      ...(type ? { type } : {}),
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getProductById(
  context: ServiceContext,
  input: ProductIdInput
) {
  const { companyId } = context;
  const { productId } = input;

  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      companyId,
    },
  });

  if (!product) {
    throw new ProductServiceError("Product not found", 404);
  }

  return product;
}

export async function createProduct(
  context: ServiceContext,
  data: CreateProductInput
) {
  const { companyId, userId } = context;

  if (data.code) {
    const existingProductWithCode = await prisma.product.findFirst({
      where: {
        companyId,
        code: data.code,
      },
    });

    if (existingProductWithCode) {
      throw new ProductServiceError(
        "A product with this code already exists",
        409
      );
    }
  }

  if (data.revenueAccountId) {
    const account = await prisma.accountingAccount.findFirst({
      where: {
        id: data.revenueAccountId,
        companyId,
        active: true,
      },
    });

    if (!account) {
      throw new ProductServiceError("Revenue account not found", 404);
    }
  }

  return prisma.$transaction(async (tx) => {
    const lastProduct = await tx.product.findFirst({
      where: { companyId },
      orderBy: { number: "desc" },
      select: { number: true },
    });

    const createdProduct = await tx.product.create({
      data: {
        ...data,
        companyId,
        number: (lastProduct?.number ?? 0) + 1,
      },
    });

    await tx.auditLog.create({
      data: {
        entityType: "Product",
        entityId: createdProduct.id,
        action: "CREATE",
        newValue: toAuditJson(createdProduct),
        companyId,
        userId,
      },
    });

    return createdProduct;
  });
}

export async function updateProduct(
  context: ServiceContext,
  input: ProductIdInput,
  data: UpdateProductInput
) {
  const { companyId, userId } = context;
  const { productId } = input;

  const existingProduct = await prisma.product.findFirst({
    where: {
      id: productId,
      companyId,
    },
  });

  if (!existingProduct) {
    throw new ProductServiceError("Product not found", 404);
  }

  if (data.code) {
    const duplicatedProduct = await prisma.product.findFirst({
      where: {
        companyId,
        code: data.code,
        id: {
          not: productId,
        },
      },
    });

    if (duplicatedProduct) {
      throw new ProductServiceError(
        "Another product with this code already exists",
        409
      );
    }
  }

  if (data.revenueAccountId) {
    const account = await prisma.accountingAccount.findFirst({
      where: {
        id: data.revenueAccountId,
        companyId,
        active: true,
      },
    });

    if (!account) {
      throw new ProductServiceError("Revenue account not found", 404);
    }
  }

  return prisma.$transaction(async (tx) => {
    const updatedProduct = await tx.product.update({
      where: {
        id: productId,
      },
      data,
    });

    await tx.auditLog.create({
      data: {
        entityType: "Product",
        entityId: updatedProduct.id,
        action: "UPDATE",
        oldValue: toAuditJson(existingProduct),
        newValue: toAuditJson(updatedProduct),
        companyId,
        userId,
      },
    });

    return updatedProduct;
  });
}

export async function deactivateProduct(
  context: ServiceContext,
  input: ProductIdInput
) {
  const { companyId, userId } = context;
  const { productId } = input;

  const existingProduct = await prisma.product.findFirst({
    where: {
      id: productId,
      companyId,
    },
  });

  if (!existingProduct) {
    throw new ProductServiceError("Product not found", 404);
  }

  if (!existingProduct.active) {
    throw new ProductServiceError("Product is already inactive", 409);
  }

  return prisma.$transaction(async (tx) => {
    const deactivatedProduct = await tx.product.update({
      where: {
        id: productId,
      },
      data: {
        active: false,
      },
    });

    await tx.auditLog.create({
      data: {
        entityType: "Product",
        entityId: deactivatedProduct.id,
        action: "DELETE",
        oldValue: toAuditJson(existingProduct),
        newValue: toAuditJson(deactivatedProduct),
        companyId,
        userId,
      },
    });

    return deactivatedProduct;
  });
}