"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "antd";
import type { MenuProps } from "antd";

const navItems: Array<{ key: string; href: string; label: string }> = [
  { key: "/co-minh-english", href: "/co-minh-english", label: "Cô Minh English" },
  {
    key: "/tu-dien-cua-co-lanh",
    href: "/tu-dien-cua-co-lanh",
    label: "Từ điển của Cô Lành",
  },
  { key: "/kieu-gia-xang", href: "/kieu-gia-xang", label: "Kiều Giá Xăng" },
];

export default function Sidebar() {
  const pathname = usePathname();

  const items: MenuProps["items"] = navItems.map((item) => ({
    key: item.key,
    label: (
      <Link href={item.href} className="block w-full">
        {item.label}
      </Link>
    ),
  }));

  const selectedKeys =
    pathname && pathname !== "/" ? [pathname] : navItems[0] ? [navItems[0].key] : [];

  return (
    <aside className="w-72 shrink-0 p-4">
      <div className="h-full overflow-auto rounded-2xl bg-white/40 p-4 backdrop-blur">
        <div className="mb-3 text-lg font-semibold text-zinc-900">Menu</div>
        <Menu
          mode="inline"
          items={items}
          selectedKeys={selectedKeys}
          style={{ background: "transparent", border: "none" }}
        />
      </div>
    </aside>
  );
}

