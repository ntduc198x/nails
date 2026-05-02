export type ManageScreenKey =
  | "customers"
  | "reports"
  | "tax-books"
  | "content"
  | "services"
  | "resources"
  | "team";

export type ManageScreenItem = {
  key: ManageScreenKey;
  title: string;
  subtitle: string;
  route: string;
  group: "insights" | "setup";
  icon: "user-plus" | "bar-chart-2" | "book-open" | "layout" | "package" | "grid" | "users";
};

export const MANAGE_SCREEN_ITEMS: ManageScreenItem[] = [
  {
    key: "customers",
    title: "CRM khách",
    subtitle: "Khach moi, quay lai, nguy co roi bo va tep VIP.",
    route: "/(admin)/manage-customers",
    group: "insights",
    icon: "user-plus",
  },
  {
    key: "reports",
    title: "Bao cao",
    subtitle: "Theo dõi bill, doanh thu, lọc nhân viên và phân tích.",
    route: "/(admin)/manage-reports",
    group: "insights",
    icon: "bar-chart-2",
  },
  {
    key: "tax-books",
    title: "So thue",
    subtitle: "Mau S1a-HKD, ky ke khai va xuat file phuc vu nop thue.",
    route: "/(admin)/manage-tax-books",
    group: "insights",
    icon: "book-open",
  },
  {
    key: "content",
    title: "Nội dung khách",
    subtitle: "Quản lý Home, Explore, storefront, bài feed và ưu đãi hiển thị cho khách hàng.",
    route: "/(admin)/manage-content",
    group: "setup",
    icon: "layout",
  },
  {
    key: "services",
    title: "Dịch vụ",
    subtitle: "Quản lý danh mục dịch vụ, lookbook và mục ẩn.",
    route: "/(admin)/manage-services",
    group: "setup",
    icon: "package",
  },
  {
    key: "resources",
    title: "Tai nguyen",
    subtitle: "Ghe, ban va trang thai tai nguyen dung trong cua hang.",
    route: "/(admin)/manage-resources",
    group: "setup",
    icon: "grid",
  },
  {
    key: "team",
    title: "Nhan su",
    subtitle: "Vai trò, danh sách nhân sự và quyền truy cập nội bộ.",
    route: "/(admin)/manage-team",
    group: "setup",
    icon: "users",
  },
];

export function getManageScreenItem(key: ManageScreenKey) {
  return MANAGE_SCREEN_ITEMS.find((item) => item.key === key) ?? null;
}
