import type { NextRequest } from "next/server";
import { adminJson, authorizeAdminSession } from "./admin-auth";
import { adminRequestContext } from "./admin-request-context";
import { prisma } from "./prisma";

export async function recordAdminAuth(user: { email: string; name: string }, action: "LOGIN_PASSWORD" | "LOGIN_GOOGLE" | "LOGOUT", request: Pick<NextRequest, "headers">) {
  await prisma.adminActivityLog.create({ data: {
    actorEmail: user.email, actorName: user.name, resource: "auth", action, ...adminRequestContext(request.headers),
    target: user.email, status: action === "LOGOUT" ? 204 : 200,
  } });
}

// Only these identifiers enter the log; never persist request bodies or credentials.
export function activityDetails(resource: string, method: string, body: Record<string, unknown>) {
  const actions = ["addAdmin", "removeAdmin", "setCredentials", "updateUser", "updateCustomer"];
  const action = resource === "users" && actions.includes(String(body.action)) ? String(body.action) : method;
  const target = [body.id, body.code, body.email, body.googleId, body.slug, body.name, body.title].find((value) => typeof value === "string" && value.trim());
  return { action, target: typeof target === "string" ? target.slice(0, 255) : "", resource: resource === "catalog" && (body.kind === "brand" || body.kind === "category") ? body.kind : resource };
}

export function withAdminActivity(resource: string, handler: (request: NextRequest) => Promise<Response>) {
  return async (request: NextRequest) => {
    let entry;
    try {
      const { user, denied } = await authorizeAdminSession(request, true);
      if (denied) return denied;
      let body = {};
      try { const value = await request.clone().json(); if (value && typeof value === "object" && !Array.isArray(value)) body = value; } catch { /* Handler reports invalid JSON. */ }
      // Persist the attempt before changing data. Status 0 means an unfinished request.
      entry = await prisma.adminActivityLog.create({ data: { actorEmail: user.email, actorName: user.name, ...activityDetails(resource, request.method, body), ...adminRequestContext(request.headers) } });
    } catch {
      return adminJson({ error: "บันทึกประวัติกิจกรรมไม่สำเร็จ กรุณาลองอีกครั้ง" }, 503);
    }
    let response: Response;
    try { response = await handler(request); }
    catch { response = adminJson({ error: "ดำเนินการไม่สำเร็จ กรุณาลองอีกครั้ง" }, 500); }
    try { await prisma.adminActivityLog.update({ where: { id: entry.id }, data: { status: response.status } }); }
    catch { console.error("Unable to finalize admin activity", entry.id); }
    return response;
  };
}
