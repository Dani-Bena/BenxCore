import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma.js";

async function main() {
  const demoEmail = "daniel@test.com";
  const demoPassword = "12345678";

  const passwordHash = await bcrypt.hash(demoPassword, 10);

  let user = await prisma.user.findUnique({
    where: {
      email: demoEmail,
    },
    include: {
      company: true,
    },
  });

  let companyId: number;

  if (!user) {
    const company = await prisma.company.create({
      data: {
        name: "BenxCore Demo Company",
        nif: "B12345678",
        email: "info@benxcore.com",
        phone: "600123456",
        address: "Calle Demo 1, Madrid",
        users: {
          create: {
            name: "Daniel",
            email: demoEmail,
            passwordHash,
            role: "ADMIN",
          },
        },
      },
      include: {
        users: true,
      },
    });

    companyId = company.id;
    console.log("Created demo company and admin user");
  } else {
    if (!user.companyId) {
      throw new Error("Existing demo user has no company assigned");
    }

    companyId = user.companyId;

    await prisma.company.update({
      where: {
        id: companyId,
      },
      data: {
        name: "BenxCore Demo Company",
        nif: "B12345678",
        email: "info@benxcore.com",
        phone: "600123456",
        address: "Calle Demo 1, Madrid",
      },
    });

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        name: "Daniel",
        passwordHash,
        role: "ADMIN",
      },
    });

    console.log("Updated demo company and admin user");
  }

  const existingClient = await prisma.client.findFirst({
    where: {
      companyId,
      taxId: "B87654321",
    },
  });

  if (existingClient) {
    await prisma.client.update({
      where: {
        id: existingClient.id,
      },
      data: {
        legalName: "Cliente Demo S.L.",
        tradeName: "Cliente Demo",
        type: "COMPANY",
        taxId: "B87654321",
        taxIdType: "CIF",
        email: "cliente@demo.com",
        invoicingEmail: "facturas@demo.com",
        phone: "611222333",
        contactName: "Juan Pérez",
        address: "Calle Cliente 10",
        city: "Madrid",
        province: "Madrid",
        postalCode: "28001",
        countryCode: "ES",
        paymentTermsDays: 30,
        notes: "Cliente demo para pruebas",
        active: true,
      },
    });

    console.log("Updated demo client");
  } else {
    await prisma.client.create({
      data: {
        companyId,
        number: 1,
        legalName: "Cliente Demo S.L.",
        tradeName: "Cliente Demo",
        type: "COMPANY",
        taxId: "B87654321",
        taxIdType: "CIF",
        email: "cliente@demo.com",
        invoicingEmail: "facturas@demo.com",
        phone: "611222333",
        contactName: "Juan Pérez",
        address: "Calle Cliente 10",
        city: "Madrid",
        province: "Madrid",
        postalCode: "28001",
        countryCode: "ES",
        paymentTermsDays: 30,
        notes: "Cliente demo para pruebas",
        active: true,
      },
    });

    console.log("Created demo client");
  }

  await prisma.product.upsert({
    where: {
      companyId_code: {
        companyId,
        code: "WEB-001",
      },
    },
    update: {
      name: "Desarrollo web corporativo",
      description: "Servicio de diseño y desarrollo web corporativo",
      type: "SERVICE",
      unit: "project",
      price: "1200.00",
      costPrice: "300.00",
      taxRate: "21.00",
      active: true,
    },
    create: {
      companyId,
      number: 1,
      code: "WEB-001",
      name: "Desarrollo web corporativo",
      description: "Servicio de diseño y desarrollo web corporativo",
      type: "SERVICE",
      unit: "project",
      price: "1200.00",
      costPrice: "300.00",
      taxRate: "21.00",
      active: true,
    },
  });

  console.log("Upserted demo product");

  await prisma.invoiceSeries.upsert({
    where: {
      companyId_code: {
        companyId,
        code: "FACT-2026",
      },
    },
    update: {
      prefix: "F2026-",
      year: 2026,
      active: true,
    },
    create: {
      companyId,
      number: 1,
      code: "FACT-2026",
      prefix: "F2026-",
      currentNumber: 0,
      year: 2026,
      active: true,
    },
  });

  console.log("Upserted demo invoice series");

  console.log("Seed completed");
  console.log(`Demo user: ${demoEmail}`);
  console.log(`Demo password: ${demoPassword}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });