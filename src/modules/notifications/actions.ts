"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/modules/auth/session";
import { markAllRead } from "./service";

export async function readAllNotifications() {
  const user = await requireUser();
  await markAllRead(user.id);
  revalidatePath("/", "layout");
}
