import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app.js";

describe("Company user management", () => {
  it("allows ADMIN to manage company users and blocks non-admin users", async () => {
    const unique = Date.now();

    const adminEmail = `admin-users-${unique}@benxcore.test`;
    const accountantEmail = `accountant-${unique}@benxcore.test`;

    const registerResponse = await request(app)
      .post("/api/auth/register")
      .send({
        companyName: `Users Test Company ${unique}`,
        name: "Admin User",
        email: adminEmail,
        password: "12345678",
      })
      .expect(201);

    const adminToken = registerResponse.body.token;
    const adminId = registerResponse.body.user.id;

    expect(adminToken).toBeTruthy();
    expect(adminId).toBeTruthy();
    expect(registerResponse.body.user.role).toBe("ADMIN");

    const createdUserResponse = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Accountant User",
        email: accountantEmail,
        password: "12345678",
        role: "ACCOUNTANT",
      })
      .expect(201);

    const accountantUser = createdUserResponse.body.user;

    expect(accountantUser.id).toBeTruthy();
    expect(accountantUser.email).toBe(accountantEmail);
    expect(accountantUser.role).toBe("ACCOUNTANT");
    expect(accountantUser.active).toBe(true);
    expect(accountantUser.passwordHash).toBeUndefined();

    const listUsersResponse = await request(app)
      .get("/api/users?includeInactive=true")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    expect(listUsersResponse.body.users.length).toBe(2);

    const accountantLoginResponse = await request(app)
      .post("/api/auth/login")
      .send({
        email: accountantEmail,
        password: "12345678",
      })
      .expect(200);

    const accountantToken = accountantLoginResponse.body.token;

    expect(accountantToken).toBeTruthy();
    expect(accountantLoginResponse.body.user.role).toBe("ACCOUNTANT");

    await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${accountantToken}`)
      .expect(403);

    await request(app)
      .delete(`/api/users/${adminId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(409);

    const deactivateResponse = await request(app)
      .delete(`/api/users/${accountantUser.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    expect(deactivateResponse.body.user.active).toBe(false);

    await request(app)
      .post("/api/auth/login")
      .send({
        email: accountantEmail,
        password: "12345678",
      })
      .expect(401);

    const usersAfterDeactivateResponse = await request(app)
      .get("/api/users?includeInactive=true")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    const inactiveAccountant = usersAfterDeactivateResponse.body.users.find(
      (user: any) => user.id === accountantUser.id
    );

    expect(inactiveAccountant).toBeTruthy();
    expect(inactiveAccountant.active).toBe(false);
  });
});