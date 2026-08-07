import { redirect } from "next/navigation"

/** Single admin account — no admin directory under user management. */
export default function AdminAdminsPage() {
  redirect("/admin/user-management/staff")
}
