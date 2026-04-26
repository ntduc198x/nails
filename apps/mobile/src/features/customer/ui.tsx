import Feather from "@expo/vector-icons/Feather";
import { router, usePathname } from "expo-router";
import { type ReactNode } from "react";
import {
  Pressable,
  RefreshControl,
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
  onRefresh?: (() => void) | null;
  refreshing?: boolean;
  scroll?: boolean;
  subtitle?: string;
  title: string;
};

type NavItem = {
  href: "/(customer)" | "/(customer)/explore" | "/(customer)/notifications" | "/(customer)/profile";
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  match: (pathname: string) => boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/(customer)", icon: "home", label: "Trang chủ", match: (pathname) => pathname === "/" || pathname === "" },
  { href: "/(customer)/explore", icon: "search", label: "Khám phá", match: (pathname) => pathname === "/explore" },
  { href: "/(customer)/notifications", icon: "bell", label: "Thông báo", match: (pathname) => pathname === "/notifications" },
  { href: "/(customer)/profile", icon: "user", label: "Cá nhân", match: (pathname) => PROFILE_PATHS.has(pathname) },
];

type IconKind = "home" | "explore" | "booking" | "profile" | "plus" | "bell";

function ShellIcon({ active = false, kind }: { active?: boolean; kind: IconKind }) {
  const tint = active ? colors.accent : colors.textMuted;
  const iconName: React.ComponentProps<typeof Feather>["name"] =
    kind === "home"
      ? "home"
      : kind === "explore"
        ? "search"
        : kind === "booking"
          ? "bell"
          : kind === "profile"
            ? "user"
            : kind === "bell"
              ? "shopping-bag"
              : "plus";

  return <Feather color={kind === "plus" ? colors.surface : tint} name={iconName} size={18} />;
}

export function CustomerScreen({
  children,
  contentContainerStyle,
  floatingActionButton,
  headerSlot,
  hideHeader = false,
  onRefresh,
  refreshing = false,
  scroll = true,
  subtitle,
  title,
}: CustomerScreenProps) {
  const Body = scroll ? ScrollView : View;
  const resolvedHeaderSlot = headerSlot ?? <CustomerTopActions />;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.shell}>
        {!hideHeader ? (
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.headerTitle}>{title}</Text>
              {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
            </View>
            <View style={styles.headerSlot}>{resolvedHeaderSlot}</View>
          </View>
        ) : null}

        <Body
          style={styles.body}
          refreshControl={
            scroll && onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.accent}
                colors={[colors.accent]}
              />
            ) : undefined
          }
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

export function CustomerTopActions() {
  return (
    <View style={styles.topActions}>
      <Pressable style={styles.topIconButton} onPress={() => router.replace("/(customer)/membership")}>
        <Feather color={colors.text} name="award" size={18} />
        <View style={styles.topDot} />
      </Pressable>
      <Pressable style={styles.topIconButton} onPress={() => router.replace("/(customer)/settings")}>
        <Feather color={colors.text} name="settings" size={18} />
      </Pressable>
    </View>
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
                <Feather color={active ? colors.accent : colors.textMuted} name={item.icon} size={18} />
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
                <Feather color={active ? colors.accent : colors.textMuted} name={item.icon} size={18} />
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
      <Text style={styles.searchGlyph}>Tim</Text>
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
      <Text style={styles.fabText}>{label ?? "Them"}</Text>
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
      <SectionTitle title="Them" subtitle="Mo nhanh cac man phu can thiet" actionLabel={onClose ? "Dong" : undefined} onPress={onClose} />
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
    backgroundColor: "#fffaf5",
  },
  shell: {
    flex: 1,
    backgroundColor: "#fffaf5",
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: spacing.md,
    paddingHorizontal: 18,
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
  topActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  topIconButton: {
    alignItems: "center",
    height: 34,
    justifyContent: "center",
    position: "relative",
    width: 34,
  },
  topDot: {
    backgroundColor: "#ef4444",
    borderRadius: 4,
    height: 8,
    position: "absolute",
    right: 4,
    top: 5,
    width: 8,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    gap: spacing.lg,
    paddingBottom: 140,
    paddingHorizontal: 18,
  },
  bodyContentWithoutHeader: {
    paddingTop: spacing.xs,
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
    bottom: 10,
    left: 0,
    position: "absolute",
    right: 0,
  },
  fabShell: {
    bottom: 112,
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
    backgroundColor: "#fffdf9",
    borderColor: "#efe1d4",
    borderRadius: 30,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 10,
    paddingHorizontal: 12,
    paddingTop: 10,
    width: "94%",
  },
  navGroup: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  navCenterButton: {
    ...shadow.floating,
    alignItems: "center",
    backgroundColor: "#9c6b3c",
    borderRadius: radius.pill,
    height: 58,
    justifyContent: "center",
    marginHorizontal: spacing.sm,
    marginTop: -24,
    width: 58,
  },
  navItem: {
    alignItems: "center",
    gap: 7,
    justifyContent: "center",
    minHeight: 52,
    minWidth: 64,
  },
  navItemText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "500",
  },
  navItemTextActive: {
    color: colors.accent,
    fontWeight: "800",
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
});
