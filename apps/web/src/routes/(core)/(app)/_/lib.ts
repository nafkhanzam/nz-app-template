// Navigation items structure
export type NavSingle = {
  _type: "single";
  label: string;
  href: string;
  icon?: string;
  danger?: boolean;
  // Replaces default navigation to href (href stays as the fallback).
  onclick?: () => void | Promise<void>;
};
export type NavDropdown = {
  _type: "dropdown";
  label: string;
  children: NavSingle[];
};
export type NavDivider = {
  _type: "divider";
};
export type NavItem = NavSingle | NavDropdown;
export type SidebarItem = NavSingle | NavDivider;
