import Link from "next/link";

export type ManageQuickNavItem = {
  href: string;
  label: string;
  accent?: boolean;
};

export function ManageQuickNav({ items, className = "" }: { items: ManageQuickNavItem[]; className?: string }) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`.trim()}>
      {items.map((item) => (
        <Link key={`${item.href}-${item.label}`} href={item.href} className={item.accent ? "manage-quick-link-accent" : "manage-quick-link"}>
          {item.label}
        </Link>
      ))}
    </div>
  );
}
