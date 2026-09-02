import { isStaffAreaPath } from "@/lib/auth/home-path"

/** Queue TV boards stay on the public (light) appearance. */
function isPublicDisplayPath(pathname: string) {
  return (
    pathname === "/display" ||
    pathname.startsWith("/display/") ||
    pathname === "/queue-management/display" ||
    pathname.startsWith("/queue-management/display/")
  )
}

/** Staff app chrome that may follow the signed-in account's theme. */
export function isStaffAppearancePath(pathname: string) {
  if (isPublicDisplayPath(pathname)) return false
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    return true
  }
  return isStaffAreaPath(pathname)
}

/** Landing, login, legal, and other public routes always stay light. */
export function isPublicAppearancePath(pathname: string) {
  return !isStaffAppearancePath(pathname)
}

/**
 * Runs immediately after next-themes' storage script so a staff member's
 * dark preference cannot flash onto landing or other public pages.
 */
export const PUBLIC_APPEARANCE_BOOTSTRAP = `(function(){try{var p=location.pathname;var display=p==="/display"||p.indexOf("/display/")===0||p==="/queue-management/display"||p.indexOf("/queue-management/display/")===0;var staff=!display&&(/^\\/(admin|nurse|physician|dentist|dashboard)(\\/|$)/.test(p)||p==="/queue-management"||p.indexOf("/queue-management/")===0);if(staff)return;var d=document.documentElement;d.classList.remove("dark");d.classList.add("light");d.style.colorScheme="light";}catch(e){}})();`
