import { redirect } from "next/navigation";
import { requireUser } from "@/modules/auth/session";

export default async function Home() {
  const user = await requireUser();
  redirect(user.role === "FACULTY" ? "/faculty/quests" : "/quests");
}
