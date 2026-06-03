"use server";

import { revalidatePath } from "next/cache";
import { promoteToAdmin } from "@/actions/admin";

export async function promoteUserAction(formData: FormData) {
  const profileId = formData.get("profileId") as string;
  if (!profileId) return;
  await promoteToAdmin(profileId);
  revalidatePath("/admin/users");
}
