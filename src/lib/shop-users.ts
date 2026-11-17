import { prisma } from "@/lib/prisma";
import { normalizeEmail, type UserRole } from "@/lib/admin-policy";
import { readAuthToken } from "@/lib/google-auth";

export async function userRole(email: string): Promise<UserRole> {
  const normalized = normalizeEmail(email);
  return (await prisma.adminCredential.findUnique({ where: { email: normalized }, select: { active: true } }))?.active ? "admin" : "customer";
}

export async function registerGoogleUser(profile: { sub: string; email: string; name?: string; picture?: string }) {
  const email = normalizeEmail(profile.email);
  const local = await prisma.shopUser.findUnique({ where: { email } });
  if (local?.googleId.startsWith("local:")) {
    if (local.disabled) throw new Error("Account disabled");
    return prisma.shopUser.update({ where: { googleId: local.googleId }, data: { googleId: profile.sub, picture: profile.picture ?? null, lastLogin: new Date() } });
  }
  const user = await prisma.shopUser.upsert({
    where: { googleId: profile.sub },
    create: { googleId: profile.sub, email, name: profile.name || email.split("@")[0], picture: profile.picture ?? null },
    update: { email, picture: profile.picture ?? null, lastLogin: new Date() },
  });
  if (user.disabled) throw new Error("Account disabled");
  return user;
}

export async function sessionUser(token?: string) {
  if (!token) return null;
  let claims;
  try { claims = await readAuthToken(token, "session"); } catch { return null; }
  if (typeof claims.sub !== "string" || typeof claims.email !== "string" || typeof claims.name !== "string") return null;
  // The database is a network round trip away, so the lookups run together. The stored user's email must equal the
  // token's email (checked below), which lets the credential rows be keyed by the token's email without waiting for it.
  const email = normalizeEmail(claims.email);
  const [user, admin, customer] = await Promise.all([
    prisma.shopUser.findUnique({ where: { googleId: claims.sub } }),
    prisma.adminCredential.findUnique({ where: { email } }),
    claims.authMethod === "customer-password" ? prisma.customerCredential.findUnique({ where: { email } }) : null,
  ]);
  if (!user || user.disabled || user.email !== email) return null;
  const role: UserRole = admin?.active ? "admin" : "customer";
  let mustChangePassword = false;
  if (claims.authMethod === "password") {
    if (!admin?.active || !admin.passwordHash || admin.version !== claims.credentialVersion) return null;
    mustChangePassword = admin.mustChangePassword === true;
  }
  if (claims.authMethod === "customer-password") {
    if (!customer || customer.version !== claims.credentialVersion || role === "admin") return null;
  }
  return { googleId: user.googleId, email: user.email, name: user.name, phone: user.phone, picture: user.picture, role, mustChangePassword };
}
