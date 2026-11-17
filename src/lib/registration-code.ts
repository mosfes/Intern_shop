import { createHmac } from "node:crypto";
import { authConfig } from "@/lib/google-auth";

export const codeHash = (email: string, code: string) => createHmac("sha256", authConfig().key).update(`${email}:${code}`).digest("hex");
