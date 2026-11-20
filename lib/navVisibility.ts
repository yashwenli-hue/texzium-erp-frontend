import { NavItem, NavSection, ROLE_NAV_HREFS } from "./pageMeta";

/**
 * The navigation a person may see: an item that names a permission is left out without it,
 * a role with its own menu (ROLE_NAV_HREFS) sees only its pages, and a section with nothing
 * left is dropped.
 */
export function visibleNavSections(
  sections: NavSection[],
  hasPermission: (permission: string) => boolean,
  role?: string,
  roleNav: Record<string, string[]> = ROLE_NAV_HREFS
): NavSection[] {
  const only = role ? roleNav[role] : undefined;
  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (item: NavItem) => (!item.permission || hasPermission(item.permission)) && (!only || only.includes(item.href))
      ),
    }))
    .filter((section) => section.items.length > 0);
}
