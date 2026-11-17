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
  const user = await prisma.shopUser.findUnique({ where: { googleId: claims.sub } });
  if (!user || user.disabled || user.email !== normalizeEmail(claims.email)) return null;
  let mustChangePassword = false;
  if (claims.authMethod === "password") {
    const credential = await prisma.adminCredential.findUnique({ where: { email: user.email } });
    if (!credential?.active || !credential.passwordHash || credential.version !== claims.credentialVersion) return null;
    mustChangePassword = credential.mustChangePassword === true;
  }
  return { googleId: user.googleId, email: user.email, name: user.name, phone: user.phone, picture: user.picture, role: await userRole(user.email), mustChangePassword };
}
