import { prisma } from "./prisma";
import { toDiscountCode } from "./discount-codes";

export async function findDiscountCode(code: string) {
  const row = await prisma.discountCode.findUnique({ where: { code } });
  return row ? toDiscountCode(row) : null;
}

/** Counts one use, atomically, so a limited code can't be oversold. Returns false if it can no longer be used. */
export async function redeemDiscountCode(code: string) {
  const used = await prisma.$executeRaw`UPDATE \`DiscountCode\` SET \`usedCount\` = \`usedCount\` + 1 WHERE \`code\` = ${code} AND \`active\` = true AND (\`usageLimit\` IS NULL OR \`usedCount\` < \`usageLimit\`) AND (\`expiresAt\` IS NULL OR \`expiresAt\` > NOW(3))`;
  return used === 1;
}
