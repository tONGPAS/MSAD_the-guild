import "server-only";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { MAX_ATTACHMENT_BYTES } from "@/lib/rules";

const BUCKET = "attachments";

function client() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export const attachmentsEnabled = () => client() !== null;

//SEC-06: trust the file's first bytes, not its name or the browser's claimed type
function sniff(bytes: Uint8Array): { ext: string; mime: string } | null {
  const b = bytes;
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { ext: "png", mime: "image/png" };
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: "jpg", mime: "image/jpeg" };
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return { ext: "gif", mime: "image/gif" };
  return null;
}

export type UploadResult = { ref: string } | { error: string };

//FR-09, SR-07: file goes to storage, only the path goes in the database
export async function uploadAttachment(file: File): Promise<UploadResult> {
  const sb = client();
  if (!sb) return { error: "Attachments are not configured on this server." };
  if (file.size > MAX_ATTACHMENT_BYTES) return { error: "The image is larger than 5 MB." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniff(bytes);
  if (!kind) return { error: "Only PNG, JPG, or GIF images can be attached." };

  const ref = `${randomUUID()}.${kind.ext}`;
  const { error } = await sb.storage.from(BUCKET).upload(ref, bytes, { contentType: kind.mime });
  if (error) return { error: "The image could not be uploaded. Try again or submit without it." };
  return { ref };
}

export async function removeAttachment(ref: string) {
  await client()?.storage.from(BUCKET).remove([ref]);
}

//Private bucket: viewers get a link that stops working after 10 minutes
export async function attachmentUrl(ref: string) {
  const { data } = (await client()?.storage.from(BUCKET).createSignedUrl(ref, 600)) ?? {};
  return data?.signedUrl ?? null;
}
