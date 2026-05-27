export interface Item {
  title: string;
  href: string;
  icon: React.ReactNode;
  exact?: boolean;
  menu?: Menu;
}

interface Group {
  label?: string;
  items: Item[];
}

export type Menu = Group[];

export const ROOT_MENU_HREF = "/";
