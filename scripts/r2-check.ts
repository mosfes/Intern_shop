/**
 * Checks that the R2 credentials in .env can write, read and delete in the bucket,
 * and that NEXT_PUBLIC_IMAGE_BASE_URL serves files publicly.
 * Run: npx tsx scripts/r2-check.ts
 */
import { DeleteObjectCommand, HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { bucket, r2 } from "./r2-client";

async function main() {
  const key = "_healthcheck.txt";
  await r2.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: "ok", ContentType: "text/plain" }));
  console.log("✓ write");
  await r2.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
  console.log("✓ read");

  const base = process.env.NEXT_PUBLIC_IMAGE_BASE_URL;
  if (base) {
    const res = await fetch(`${base.replace(/\/$/, "")}/${key}`);
    console.log(res.ok ? "✓ public URL" : `✗ public URL returned HTTP ${res.status} (${base})`);
  }

  await r2.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  console.log("✓ delete");
}

main().catch((e) => {
  console.error("✗", e.name, e.message);
  process.exit(1);
});
