import { router, usePathname } from "expo-router";
import { type ReactNode } from "react";
import {
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { premiumTheme } from "@/src/design/premium-theme";

const { colors, radius, shadow, spacing } = premiumTheme;

const PROFILE_PATHS = new Set([
  "/profile",
  "/offers",
  "/membership",
  "/reviews",
  "/notifications",
  "/payment-methods",
  "/addresses",
  "/settings",
  "/favorites",
]);

type CustomerScreenProps = {
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  floatingActionButton?: ReactNode;
  headerSlot?: ReactNode;
  hideHeader?: boolean;
  scroll?: boolean;
  subtitle?: string;
  title: string;
};

type NavItem = {
  href: "/(customer)" | "/(customer)/explore" | "/(customer)/notifications" | "/(customer)/profile";
  icon: "home" | "explore" | "booking" | "profile";
  label: string;
  match: (pathname: string) => boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/(customer)", icon: "home", label: "Trang chủ", match: (pathname) => pathname === "/" || pathname === "" },
  { href: "/(customer)/explore", icon: "explore", label: "Khám phá", match: (pathname) => pathname === "/explore" },
  { href: "/(customer)/notifications", icon: "booking", label: "Thông báo", match: (pathname) => pathname === "/notifications" },
  { href: "/(customer)/profile", icon: "profile", label: "Cá nhân", match: (pathname) => PROFILE_PATHS.has(pathname) },
];

type IconKind = "home" | "explore" | "booking" | "profile" | "plus" | "bell";

function ShellIcon({ active = false, kind }: { active?: boolean; kind: IconKind }) {
  const tint = active ? colors.accent : colors.textMuted;

  if (kind === "home") {
    return (
      <View style={styles.iconFrame}>
        <View style={[styles.iconRoof, { borderBottomColor: tint }]} />
        <View style={[styles.iconHouseBody, { borderColor: tint }]} />
      </View>
    );
  }

  if (kind === "explore") {
    return (
      <View style={styles.iconFrame}>
        <View style={[styles.iconBubble, { borderColor: tint }]} />
        <View style={[styles.iconBubbleTail, { borderTopColor: tint }]} />
      </View>
    );
  }

  if (kind === "booking") {
    return (
      <View style={[styles.iconCalendar, { borderColor: tint }]}>
        <View style={[styles.iconCalendarBar, { backgroundColor: tint }]} />
        <View style={[styles.iconCalendarPinLeft, { backgroundColor: tint }]} />
        <View style={[styles.iconCalendarPinRight, { backgroundColor: tint }]} />
      </View>
    );
  }

  if (kind === "profile") {
    return (
      <View style={styles.iconFrame}>
        <View style={[styles.iconHead, { borderColor: tint }]} />
        <View style={[styles.iconShoulders, { borderColor: tint }]} />
      </View>
    );
  }

  if (kind === "bell") {
    return (
      <View style={styles.iconFrame}>
        <View style={[styles.iconBellDome, { borderColor: tint }]} />
        <View style={[styles.iconBellClapper, { backgroundColor: tint }]} />
      </View>
    );
  }

  return (
    <View style={styles.iconFrame}>
      <View style={styles.iconPlusVertical} />
      <View style={styles.iconPlusHorizontal} />
    </View>
  );
}

export function CustomerScreen({
  children,
  contentContainerStyle,
  floatingActionButton,
  headerSlot,
  hideHeader = false,
  scroll = true,
  subtitle,
  title,
}: CustomerScreenProps) {
  const Body = scroll ? ScrollView : View;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.shell}>
        {!hideHeader ? (
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.headerTitle}>{title}</Text>
              {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
            </View>
            {headerSlot ? <View style={styles.headerSlot}>{headerSlot}</View> : null}
          </View>
        ) : null}

        <Body
          style={styles.body}
          contentContainerStyle={
            scroll
              ? [
                  styles.bodyContent,
                  hideHeader ? styles.bodyContentWithoutHeader : null,
                  floatingActionButton ? styles.bodyContentWithFab : null,
                  contentContainerStyle,
                ]
              : undefined
          }
        >
          {scroll ? children : <View style={contentContainerStyle}>{children}</View>}
        </Body>

        <CustomerBottomNav />
        {floatingActionButton ? <View style={styles.fabShell}>{floatingActionButton}</View> : null}
      </View>
    </SafeAreaView>
  );
}

export function CustomerBottomNav() {
  const pathname = usePathname();
  const leftItems = NAV_ITEMS.slice(0, 2);
  const rightItems = NAV_ITEMS.slice(2);

  return (
    <View pointerEvents="box-none" style={styles.navWrap}>
      <View style={styles.navBar}>
        <View style={styles.navGroup}>
          {leftItems.map((item) => {
            const active = item.match(pathname);
            return (
              <Pressable key={item.href} style={styles.navItem} onPress={() => router.push(item.href)}>
                <ShellIcon kind={item.icon} active={active} />
                <Text style={[styles.navItemText, active ? styles.navItemTextActive : null]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable style={styles.navCenterButton} onPress={() => router.push("/(customer)/booking")}>
          <ShellIcon kind="plus" active />
        </Pressable>

        <View style={styles.navGroup}>
          {rightItems.map((item) => {
            const active = item.match(pathname);
            return (
              <Pressable key={item.href} style={styles.navItem} onPress={() => router.push(item.href)}>
                <ShellIcon kind={item.icon} active={active} />
                <Text style={[styles.navItemText, active ? styles.navItemTextActive : null]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

export function CustomerIconButton({
  icon,
  label,
  onPress,
}: {
  icon: IconKind;
  label?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable accessibilityLabel={label} style={styles.iconButton} onPress={onPress}>
      <ShellIcon kind={icon} active />
    </Pressable>
  );
}

export function CustomerAvatarBadge({ label }: { label: string }) {
  return (
    <View style={styles.avatarBadge}>
      <Text style={styles.avatarBadgeText}>{label}</Text>
    </View>
  );
}

export function SurfaceCard({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.surfaceCard, style]}>{children}</View>;
}

export function SectionTitle({
  actionLabel,
  onPress,
  subtitle,
  title,
}: {
  actionLabel?: string;
  onPress?: () => void;
  subtitle?: string;
  title: string;
}) {
  return (
    <View style={styles.sectionTitleRow}>
      <View style={styles.sectionCopy}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
      {actionLabel && onPress ? (
        <Pressable style={styles.sectionAction} onPress={onPress}>
          <Text style={styles.sectionActionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Pill({
  active = false,
  compact = false,
  label,
  onPress,
}: {
  active?: boolean;
  compact?: boolean;
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable style={[styles.pill, compact ? styles.pillCompact : null, active ? styles.pillActive : null]} onPress={onPress}>
      <Text style={[styles.pillText, active ? styles.pillTextActive : null]}>{label}</Text>
    </Pressable>
  );
}

export function SegmentedTabs<T extends string>({
  activeKey,
  items,
  onChange,
}: {
  activeKey: T;
  items: ReadonlyArray<{ key: T; label: string }>;
  onChange: (key: T) => void;
}) {
  return (
    <View style={styles.segmentWrap}>
      {items.map((item) => (
        <Pill key={item.key} compact active={item.key === activeKey} label={item.label} onPress={() => onChange(item.key)} />
      ))}
    </View>
  );
}

export function SearchField({
  onChangeText,
  placeholder,
  value,
}: {
  onChangeText?: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <View style={styles.searchField}>
      <Text style={styles.searchGlyph}>Tìm</Text>
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        style={styles.searchInput}
        value={value}
        onChangeText={onChangeText}
      />
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  subtle = false,
}: {
  label: string;
  onPress?: () => void;
  subtle?: boolean;
}) {
  return (
    <Pressable style={[styles.primaryButton, subtle ? styles.secondaryButton : null]} onPress={onPress}>
      <Text style={[styles.primaryButtonText, subtle ? styles.secondaryButtonText : null]}>{label}</Text>
    </Pressable>
  );
}

export function InfoRow({
  detail,
  onPress,
  title,
}: {
  detail?: string;
  onPress?: () => void;
  title: string;
}) {
  return (
    <Pressable style={styles.infoRow} onPress={onPress}>
      <View style={styles.infoRowCopy}>
        <Text style={styles.infoRowTitle}>{title}</Text>
        {detail ? <Text style={styles.infoRowDetail}>{detail}</Text> : null}
      </View>
      <Text style={styles.infoRowChevron}>›</Text>
    </Pressable>
  );
}

export function StatusTag({
  label,
  tone = "default",
}: {
  label: string;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  return (
    <Text
      style={[
        styles.statusTag,
        tone === "success" ? styles.statusTagSuccess : null,
        tone === "warning" ? styles.statusTagWarning : null,
        tone === "danger" ? styles.statusTagDanger : null,
      ]}
    >
      {label}
    </Text>
  );
}

export function ProgressBar({ progress }: { progress: number }) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${Math.max(0, Math.min(progress, 1)) * 100}%` }]} />
    </View>
  );
}

export function CustomerFloatingButton({
  label,
  onPress,
}: {
  label?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable style={styles.fab} onPress={onPress}>
      <Text style={styles.fabText}>{label ?? "Thêm"}</Text>
    </Pressable>
  );
}

export function CustomerAuxMenuList({
  items,
  onClose,
}: {
  items: Array<{ label: string; detail: string; onPress: () => void }>;
  onClose?: () => void;
}) {
  return (
    <SurfaceCard>
      <SectionTitle title="Thêm" subtitle="Mở nhanh các màn phụ cần thiết" actionLabel={onClose ? "Đóng" : undefined} onPress={onClose} />
      {items.map((item) => (
        <InfoRow key={item.label} title={item.label} detail={item.detail} onPress={item.onPress} />
      ))}
    </SurfaceCard>
  );
}

export const customerStyles = StyleSheet.create({
  field: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 15,
    minHeight: 54,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  fieldLabel: {
    color: colors.textSoft,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
    textTransform: "uppercase",
  },
  helperText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
  },
  rowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  shell: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  headerCopy: {
    flex: 1,
    gap: 4,
    paddingRight: spacing.md,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    color: colors.textSoft,
    fontSize: 13,
    lineHeight: 19,
  },
  headerSlot: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    gap: spacing.lg,
    paddingBottom: 128,
    paddingHorizontal: spacing.xl,
  },
  bodyContentWithoutHeader: {
    paddingTop: spacing.sm,
  },
  bodyContentWithFab: {
    paddingBottom: 176,
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  avatarBadge: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    height: 40,
    justifyContent: "center",
    minWidth: 40,
    paddingHorizontal: spacing.sm,
  },
  avatarBadgeText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: "800",
  },
  navWrap: {
    bottom: 12,
    left: 0,
    position: "absolute",
    right: 0,
  },
  fabShell: {
    bottom: 110,
    position: "absolute",
    right: spacing.xl,
  },
  fab: {
    ...shadow.floating,
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    justifyContent: "center",
    minHeight: 56,
    minWidth: 56,
    paddingHorizontal: spacing.lg,
  },
  fabText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: "800",
  },
  navBar: {
    ...shadow.floating,
    alignItems: "flex-end",
    alignSelf: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 26,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 8,
    paddingHorizontal: spacing.md,
    paddingTop: 8,
    width: "92%",
  },
  navGroup: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  navCenterButton: {
    ...shadow.floating,
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    height: 54,
    justifyContent: "center",
    marginHorizontal: spacing.sm,
    marginTop: -20,
    width: 54,
  },
  navItem: {
    alignItems: "center",
    gap: 6,
    justifyContent: "center",
    minHeight: 50,
    minWidth: 64,
  },
  navItemText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "600",
  },
  navItemTextActive: {
    color: colors.accent,
    fontWeight: "700",
  },
  surfaceCard: {
    ...shadow.card,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  sectionTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sectionCopy: {
    flex: 1,
    gap: 3,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "800",
  },
  sectionSubtitle: {
    color: colors.textSoft,
    fontSize: 13,
    lineHeight: 18,
  },
  sectionAction: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  sectionActionText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "800",
  },
  segmentWrap: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    flexDirection: "row",
    gap: spacing.sm,
    padding: 4,
  },
  pill: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 42,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
  },
  pillCompact: {
    flex: 1,
    minHeight: 40,
    paddingHorizontal: spacing.md,
  },
  pillActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  pillText: {
    color: colors.textSoft,
    fontSize: 13,
    fontWeight: "700",
  },
  pillTextActive: {
    color: colors.surface,
  },
  searchField: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 54,
    paddingHorizontal: spacing.lg,
  },
  searchGlyph: {
    color: colors.textSoft,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  searchInput: {
    color: colors.text,
    flex: 1,
    fontSize: 15,
    minHeight: 44,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  },
  primaryButtonText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: "800",
  },
  secondaryButtonText: {
    color: colors.accent,
  },
  infoRow: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    paddingVertical: spacing.md,
  },
  infoRowCopy: {
    flex: 1,
    gap: 3,
  },
  infoRowTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  infoRowDetail: {
    color: colors.textSoft,
    fontSize: 13,
    lineHeight: 18,
  },
  infoRowChevron: {
    color: colors.textMuted,
    fontSize: 18,
    fontWeight: "500",
  },
  statusTag: {
    alignSelf: "flex-start",
    backgroundColor: colors.accentSoft,
    borderRadius: radius.pill,
    color: colors.accent,
    fontSize: 11,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  statusTagSuccess: {
    backgroundColor: colors.successBg,
    color: colors.successText,
  },
  statusTagWarning: {
    backgroundColor: colors.warningBg,
    color: colors.warningText,
  },
  statusTagDanger: {
    backgroundColor: colors.dangerBg,
    color: colors.dangerText,
  },
  progressTrack: {
    backgroundColor: "#7d6858",
    borderRadius: radius.pill,
    height: 10,
    overflow: "hidden",
  },
  progressFill: {
    backgroundColor: "#efc27d",
    borderRadius: radius.pill,
    height: "100%",
  },
  iconFrame: {
    alignItems: "center",
    height: 18,
    justifyContent: "center",
    width: 18,
  },
  iconRoof: {
    borderLeftColor: "transparent",
    borderLeftWidth: 6,
    borderRightColor: "transparent",
    borderRightWidth: 6,
    borderBottomWidth: 7,
    marginBottom: -1,
  },
  iconHouseBody: {
    borderRadius: 3,
    borderWidth: 1.8,
    height: 10,
    width: 12,
  },
  iconBubble: {
    borderRadius: 6,
    borderWidth: 1.8,
    height: 11,
    width: 14,
  },
  iconBubbleTail: {
    borderLeftColor: "transparent",
    borderLeftWidth: 3,
    borderRightColor: "transparent",
    borderRightWidth: 3,
    borderTopWidth: 4,
    marginLeft: -6,
    marginTop: 8,
    position: "absolute",
  },
  iconCalendar: {
    borderRadius: 4,
    borderWidth: 1.8,
    height: 16,
    width: 16,
  },
  iconCalendarBar: {
    height: 2.2,
    left: 2,
    position: "absolute",
    right: 2,
    top: 4,
  },
  iconCalendarPinLeft: {
    borderRadius: radius.pill,
    height: 4,
    left: 4,
    position: "absolute",
    top: -2,
    width: 2.4,
  },
  iconCalendarPinRight: {
    borderRadius: radius.pill,
    height: 4,
    position: "absolute",
    right: 4,
    top: -2,
    width: 2.4,
  },
  iconHead: {
    borderRadius: radius.pill,
    borderWidth: 1.7,
    height: 7,
    width: 7,
  },
  iconShoulders: {
    borderRadius: 6,
    borderWidth: 1.7,
    height: 6,
    marginTop: 2,
    width: 14,
  },
  iconBellDome: {
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderWidth: 1.7,
    borderBottomWidth: 0,
    height: 11,
    width: 12,
  },
  iconBellClapper: {
    borderRadius: radius.pill,
    height: 3,
    marginTop: -1,
    width: 3,
  },
  iconPlusVertical: {
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    height: 18,
    position: "absolute",
    width: 3,
  },
  iconPlusHorizontal: {
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    height: 3,
    position: "absolute",
    width: 18,
  },
});
