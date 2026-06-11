import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import {
  authMiddleware,
  type AuthenticatedRequest,
} from "../../middleware/auth.middleware.js";
import { getAuthContext } from "../../utils/http.js";
import { updateCompanySchema } from "./company.schemas.js";

export const companyRouter = Router();

companyRouter.use(authMiddleware);

companyRouter.get("/", async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const context = getAuthContext(authReq);

  if (!context) {
    res.status(401).json({
      message: "User has no company assigned",
    });
    return;
  }

  const company = await prisma.company.findUnique({
    where: {
      id: context.companyId,
    },
  });

  if (!company) {
    res.status(404).json({
      message: "Company not found",
    });
    return;
  }

  res.json({
    company,
  });
});

companyRouter.put("/", async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const context = getAuthContext(authReq);

  if (!context) {
    res.status(401).json({
      message: "User has no company assigned",
    });
    return;
  }

  const result = updateCompanySchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      message: "Invalid request data",
      errors: result.error.flatten(),
    });
    return;
  }

  const updatedCompany = await prisma.company.update({
    where: {
      id: context.companyId,
    },
    data: result.data,
  });

  res.json({
    company: updatedCompany,
  });
});
