import { redirect } from "next/navigation"

/** Admin user management is staff/admins only — no patient registry. */
export default function AdminPatientsUnderUserManagementPage() {
  redirect("/admin/user-management/staff")
}
