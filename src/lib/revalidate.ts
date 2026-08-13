import { revalidatePath } from "next/cache";

export function refresh(equipmentId?: string) {
  revalidatePath("/workspace", "layout");
  revalidatePath("/admin", "layout");
  revalidatePath("/admin/requests");
  revalidatePath("/admin/members");
  if (equipmentId) {
    revalidatePath(`/workspace/equipment/${equipmentId}`);
    revalidatePath(`/admin/equipment/${equipmentId}`);
  }
}
