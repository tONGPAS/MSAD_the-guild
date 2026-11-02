import { redirect } from "next/navigation";
import { requireUser } from "@/modules/auth/session";

//The rank seal in the header links here; a Student's profile lives in the Guild Hall
export default async function MyProfile() {
  const user = await requireUser();
  redirect(user.role === "STUDENT" ? `/guild/${user.id}` : "/guild");
}
