import { NavItem, NavSection } from "./pageMeta";

/** The navigation a person may see: an item that names a permission is left out without it, and so is a section with nothing left. */
export function visibleNavSections(sections: NavSection[], hasPermission: (permission: string) => boolean): NavSection[] {
  return sections
    .map((section) => ({ ...section, items: section.items.filter((item: NavItem) => !item.permission || hasPermission(item.permission)) }))
    .filter((section) => section.items.length > 0);
}
