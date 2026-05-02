import Feather from "@expo/vector-icons/Feather";
import { useCallback, useEffect, useMemo, useState, type ComponentProps } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import {
  getCrmDashboardMetricsForMobile,
  getCustomerCrmDetailForMobile,
  listCustomersCrmForMobile,
  updateCustomerCareNoteForMobile,
  type CrmDashboardMetrics,
  type CustomerAppointmentSummary,
  type CustomerBookingSummary,
  type CustomerCrmDetail,
  type CustomerCrmSummary,
  type CustomerStatus,
  type CustomerTicketSummary,
  type CustomerTimelineActivity,
  ensureOrgContext,
} from "@nails/shared";
import { ManageScreenShell, manageStyles } from "@/src/features/admin/manage-ui";
import { mobileSupabase } from "@/src/lib/supabase";
import { useSession } from "@/src/providers/session-provider";
import { canSelectAdminBranch } from "@/src/features/admin/navigation";

const palette = { border: "#EADFD3", text: "#2F241D", sub: "#84776C", accent: "#A56D3D", accentSoft: "#F3E7DA", mutedSoft: "#F8F4EF" };
const STATUS_OPTIONS: Array<{ label: string; value: CustomerStatus | "ALL" }> = [
  { label: "Tất cả trạng thái", value: "ALL" }, { label: "Mới", value: "NEW" }, { label: "Đang hoạt động", value: "ACTIVE" },
  { label: "Quay lại", value: "RETURNING" }, { label: "VIP", value: "VIP" }, { label: "Có nguy cơ", value: "AT_RISK" }, { label: "Rời bỏ", value: "LOST" },
];
const DORMANT_DAY_OPTIONS = [{ label: "7 ngày", value: 7 }, { label: "30 ngày", value: 30 }, { label: "60 ngày", value: 60 }, { label: "90 ngày", value: 90 }];

const formatVnd = (amount: number) => new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(amount || 0);
const sourceLabel = (source: string | null) => source || "khách vãng lai";
const initials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.length ? parts.slice(-2).map((part) => part[0]?.toUpperCase() || "").join("") : "KH";
};
const statusLabel = (status: CustomerStatus) =>
  status === "ACTIVE" ? "Đang dùng" : status === "RETURNING" ? "Quay lại" : status === "AT_RISK" ? "Có nguy cơ" : status === "LOST" ? "Rời bỏ" : status;
const formatDateTime = (value: string | null) => {
  if (!value) return "Chưa có";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
};
const formatDateOnly = (value: string | null) => {
  if (!value) return "Chưa có";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
};
const formatTicketTotal = (ticket: CustomerTicketSummary) => {
  const amount = ticket.totals?.grandTotal ?? ticket.totals?.subtotal ?? 0;
  return amount > 0 ? `${formatVnd(amount)} d` : "Chưa có tong tien";
};
const activityTypeLabel = (type: CustomerTimelineActivity["type"]) =>
  type === "BOOKING_REQUEST" ? "Yêu cầu đặt lịch" :
  type === "APPOINTMENT" ? "Lịch hẹn" :
  type === "CHECKOUT" ? "Thanh toán" :
  type === "TELEGRAM_CONTACT" ? "Liên hệ Telegram" :
  "Ghi chú chăm sóc";
const appointmentLabel = (appointment: CustomerAppointmentSummary) =>
  `${formatDateTime(appointment.startAt)} - ${appointment.status || "Không rõ trạng thái"}`;
const bookingLabel = (booking: CustomerBookingSummary) =>
  `${formatDateTime(booking.requestedStartAt)} - ${booking.requestedService || "Chưa chọn dịch vụ"}`;
const FOLLOW_UP_DATE_OFFSETS = [0, 1, 3, 7, 14, 30] as const;
const FOLLOW_UP_TIME_OPTIONS = ["09:00", "11:00", "14:00", "18:00"] as const;

type BranchOption = { id: string; name: string };

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toDateTimeParts(value: string | null) {
  if (!value) return { dateKey: "", time: "09:00" };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { dateKey: "", time: "09:00" };
  return {
    dateKey: toDateKey(date),
    time: `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`,
  };
}

function buildFollowUpIso(dateKey: string, time: string) {
  if (!dateKey) return null;
  const value = new Date(`${dateKey}T${time}:00`);
  return Number.isNaN(value.getTime()) ? null : value.toISOString();
}

function describeFollowUpDateOption(offset: number) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  if (offset === 0) return { label: "Hôm nay", value: toDateKey(date) };
  if (offset === 1) return { label: "Ngày mai", value: toDateKey(date) };
  return {
    label: `+${offset} ngày (${new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit" }).format(date)})`,
    value: toDateKey(date),
  };
}

function Input(props: ComponentProps<typeof TextInput>) {
  return <TextInput {...props} placeholderTextColor="#B5A99D" style={[styles.input, props.style]} />;
}

function SelectField({ value, onPress }: { value: string; onPress: () => void }) {
  return (
    <Pressable style={styles.selectField} onPress={onPress}>
      <Text style={styles.selectValue} numberOfLines={1}>{value}</Text>
      <Feather name="chevron-down" size={16} color={palette.sub} />
    </Pressable>
  );
}

function OptionSheet<T extends string | number>({ title, options, selected, onSelect, onClose, visible }: { title: string; options: Array<{ label: string; value: T }>; selected: T; onSelect: (value: T) => void; onClose: () => void; visible: boolean; }) {
  return (
    <Modal transparent animationType="fade" visible={visible}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.sheetHeader}><Text style={styles.sheetTitle}>{title}</Text><Pressable onPress={onClose}><Feather name="x" size={18} color={palette.text} /></Pressable></View>
          {options.map((option) => (
            <Pressable key={String(option.value)} style={[styles.option, option.value === selected ? styles.optionActive : null]} onPress={() => { onSelect(option.value); onClose(); }}>
              <Text style={styles.optionText}>{option.label}</Text>
              {option.value === selected ? <Feather name="check" size={16} color={palette.accent} /> : null}
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function CustomerRow({ item, onPress }: { item: CustomerCrmSummary; onPress: () => void }) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.avatar}><Text style={styles.avatarText}>{initials(item.fullName)}</Text></View>
      <View style={styles.copy}>
        <Text style={styles.name} numberOfLines={1}>{item.fullName}</Text>
        <Text style={styles.meta} numberOfLines={2}>{item.phone ?? "Chưa có số"} · {item.totalVisits} lượt · {formatVnd(item.totalSpend)} đ · {sourceLabel(item.source)}</Text>
      </View>
      <Text style={styles.badge}>{statusLabel(item.customerStatus)}</Text>
    </Pressable>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.detailSection}>
      <Text style={styles.detailSectionTitle}>{title}</Text>
      <View style={styles.detailSectionBody}>{children}</View>
    </View>
  );
}

function DetailEmpty({ text }: { text: string }) {
  return <Text style={styles.detailEmpty}>{text}</Text>;
}

export default function AdminManageCustomersScreen() {
  const { role, user, refreshSession } = useSession();
  const userId = user?.id ?? null;
  const [rows, setRows] = useState<CustomerCrmSummary[]>([]);
  const [allRows, setAllRows] = useState<CustomerCrmSummary[]>([]);
  const [metrics, setMetrics] = useState<CrmDashboardMetrics>({ newToday: 0, returningToday: 0, atRiskCount: 0, repeat30: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftSearch, setDraftSearch] = useState("");
  const [draftStatus, setDraftStatus] = useState<CustomerStatus | "ALL">("ALL");
  const [draftSource, setDraftSource] = useState<string | "ALL">("ALL");
  const [draftVipOnly, setDraftVipOnly] = useState(false);
  const [draftDormantDays, setDraftDormantDays] = useState(30);
  const [appliedFilters, setAppliedFilters] = useState({ search: "", status: "ALL" as CustomerStatus | "ALL", source: "ALL" as string | "ALL", vipOnly: false, dormantDays: 30 });
  const [showStatusSheet, setShowStatusSheet] = useState(false);
  const [showSourceSheet, setShowSourceSheet] = useState(false);
  const [showDormantSheet, setShowDormantSheet] = useState(false);
  const [listExpanded, setListExpanded] = useState(true);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CustomerCrmDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailNote, setDetailNote] = useState("");
  const [detailTags, setDetailTags] = useState("");
  const [detailFollowUpDate, setDetailFollowUpDate] = useState("");
  const [detailFollowUpTime, setDetailFollowUpTime] = useState("09:00");
  const [detailSaving, setDetailSaving] = useState(false);
  const [showFollowUpDateSheet, setShowFollowUpDateSheet] = useState(false);
  const [showFollowUpTimeSheet, setShowFollowUpTimeSheet] = useState(false);
  const [branchOptions, setBranchOptions] = useState<BranchOption[]>([]);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [branchModalOpen, setBranchModalOpen] = useState(false);
  const [branchSaving, setBranchSaving] = useState(false);

  const load = useCallback(async (force = false, filters = appliedFilters) => {
    if (!mobileSupabase) { setError("Thieu cau hinh Supabase mobile."); setLoading(false); return; }
    try {
      if (force || !rows.length) setLoading(true); else setRefreshing(true);
      setError(null);
      const [filteredRows, customers, dashboard] = await Promise.all([
        listCustomersCrmForMobile(mobileSupabase, filters),
        listCustomersCrmForMobile(mobileSupabase),
        getCrmDashboardMetricsForMobile(mobileSupabase),
      ]);
      setRows(filteredRows); setAllRows(customers); setMetrics(dashboard);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Không tải được CRM khách.");
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, [appliedFilters, rows.length]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void load(true, appliedFilters);
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [appliedFilters, load]);

  useEffect(() => {
    async function loadBranchOptions() {
      if (!mobileSupabase || !userId || !canSelectAdminBranch(role)) return;
      try {
        const { orgId, branchId: currentBranchId } = await ensureOrgContext(mobileSupabase);
        setBranchId(currentBranchId);
        const { data, error } = await mobileSupabase
          .from("branches")
          .select("id,name")
          .eq("org_id", orgId)
          .order("created_at", { ascending: true });
        if (error) throw error;
        setBranchOptions(
          (data ?? []).map((branch) => ({
            id: String(branch.id ?? ""),
            name: typeof branch.name === "string" && branch.name.trim() ? branch.name.trim() : "Chi nhánh",
          })),
        );
      } catch {}
    }

    void loadBranchOptions();
  }, [role, userId]);

  const sourceOptions = useMemo(() => [{ label: "Tất cả nguồn", value: "ALL" }, ...Array.from(new Set(allRows.map((item) => item.source).filter(Boolean) as string[])).sort().map((item) => ({ label: item, value: item }))], [allRows]);
  const applyFilters = useCallback(() => setAppliedFilters({ search: draftSearch, status: draftStatus, source: draftSource, vipOnly: draftVipOnly, dormantDays: draftDormantDays }), [draftDormantDays, draftSearch, draftSource, draftStatus, draftVipOnly]);
  const statusLabelSelected = useMemo(() => STATUS_OPTIONS.find((option) => option.value === draftStatus)?.label ?? "Tất cả trạng thái", [draftStatus]);
  const sourceLabelSelected = useMemo(() => sourceOptions.find((option) => option.value === draftSource)?.label ?? "Tất cả nguồn", [draftSource, sourceOptions]);
  const dormantLabelSelected = useMemo(() => DORMANT_DAY_OPTIONS.find((option) => option.value === draftDormantDays)?.label ?? `${draftDormantDays} ngày`, [draftDormantDays]);
  const selectedBranchName = useMemo(
    () => branchOptions.find((branch) => branch.id === branchId)?.name ?? "Chi nhánh hiện tại",
    [branchId, branchOptions],
  );
  const followUpDateOptions = useMemo(
    () => FOLLOW_UP_DATE_OFFSETS.map((offset) => describeFollowUpDateOption(offset)),
    [],
  );
  const followUpDateLabel = useMemo(
    () =>
      followUpDateOptions.find((option) => option.value === detailFollowUpDate)?.label ??
      (detailFollowUpDate ? formatDateOnly(detailFollowUpDate) : "Chưa đặt lịch chăm sóc"),
    [detailFollowUpDate, followUpDateOptions],
  );
  const loadCustomerDetail = useCallback(async (customerId: string) => {
    if (!mobileSupabase) return;
    setSelectedCustomerId(customerId);
    setDetail(null);
    setDetailError(null);
    setDetailLoading(true);
    try {
      const nextDetail = await getCustomerCrmDetailForMobile(mobileSupabase, customerId);
      setDetail(nextDetail);
      setDetailNote(nextDetail.customer.careNote || "");
      setDetailTags(nextDetail.customer.tags.join(", "));
      const followUpParts = toDateTimeParts(nextDetail.customer.nextFollowUpAt);
      setDetailFollowUpDate(followUpParts.dateKey);
      setDetailFollowUpTime(followUpParts.time);
    } catch (nextError) {
      setDetailError(nextError instanceof Error ? nextError.message : "Không tải được chi tiết khách.");
    } finally {
      setDetailLoading(false);
    }
  }, []);
  const closeDetail = useCallback(() => {
    setSelectedCustomerId(null);
    setDetail(null);
    setDetailError(null);
    setDetailLoading(false);
    setDetailNote("");
    setDetailTags("");
    setDetailFollowUpDate("");
    setDetailFollowUpTime("09:00");
    setDetailSaving(false);
  }, []);
  const saveDetailNote = useCallback(async () => {
    if (!mobileSupabase || !detail) return;
    try {
      setDetailSaving(true);
      setDetailError(null);
      await updateCustomerCareNoteForMobile(mobileSupabase, {
        customerId: detail.customer.id,
        careNote: detailNote,
        tags: detailTags.split(",").map((item) => item.trim()).filter(Boolean),
        nextFollowUpAt: buildFollowUpIso(detailFollowUpDate, detailFollowUpTime),
        followUpStatus: "PENDING",
      });
      await loadCustomerDetail(detail.customer.id);
    } catch (nextError) {
      setDetailError(nextError instanceof Error ? nextError.message : "Không lưu được ghi chú CRM.");
    } finally {
      setDetailSaving(false);
    }
  }, [detail, detailFollowUpDate, detailFollowUpTime, detailNote, detailTags, loadCustomerDetail]);

  const handleBranchChange = useCallback(async (nextBranchId: string) => {
    if (!mobileSupabase || !userId || !canSelectAdminBranch(role) || nextBranchId === branchId) {
      setBranchModalOpen(false);
      return;
    }
    try {
      setBranchSaving(true);
      const { data, error } = await mobileSupabase
        .from("profiles")
        .update({
          default_branch_id: nextBranchId,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .select("default_branch_id")
        .single();
      if (error) throw error;
      if (data?.default_branch_id !== nextBranchId) {
        throw new Error("CAP_NHAT_CHI_NHANH_KHONG_THANH_CONG");
      }
      setBranchId(nextBranchId);
      setBranchModalOpen(false);
      await refreshSession();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Không đổi được chi nhánh.");
    } finally {
      setBranchSaving(false);
    }
  }, [branchId, refreshSession, role, userId]);

  const telegramReminderUrl = useMemo(() => {
    if (!detail) return "";
    const nextFollowUpIso = buildFollowUpIso(detailFollowUpDate, detailFollowUpTime);
    const text = `Nhắc chăm sóc khách ${detail.customer.fullName} - ${detail.customer.phone ?? "chưa có SĐT"}.\nGhi chú: ${detailNote || detail.customer.careNote || "chưa có"}\nLịch chăm sóc lại: ${nextFollowUpIso ? formatDateTime(nextFollowUpIso) : "chưa đặt"}`;
    return `https://t.me/share/url?url=${encodeURIComponent("https://chambeauty.example/crm")}&text=${encodeURIComponent(text)}`;
  }, [detail, detailFollowUpDate, detailFollowUpTime, detailNote]);

  return (
    <ManageScreenShell title="CRM khách" subtitle="Theo dõi khách mới, quay lại, VIP và nhóm có nguy cơ." currentKey="customers" group="insights" onRefresh={() => void load(false, appliedFilters)} refreshing={refreshing}>
      {canSelectAdminBranch(role) ? (
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Chi nhánh đang dùng</Text>
            <Pressable style={styles.button} disabled={branchSaving} onPress={() => setBranchModalOpen(true)}>
              <Text style={styles.buttonText}>{branchSaving ? "Đang đổi..." : "Đổi chi nhánh"}</Text>
            </Pressable>
          </View>
          <Text style={styles.branchName}>{selectedBranchName}</Text>
          <Text style={styles.branchHint}>Owner có thể đổi chi nhánh trên mobile để các màn quản trị tiếp theo dùng đúng chi nhánh.</Text>
        </View>
      ) : null}
      <View style={styles.card}><Text style={styles.total}>{allRows.length} khách</Text><Text style={styles.sub}>Tổng danh sách CRM</Text></View>
      <View style={styles.metricRow}>
        <View style={styles.metric}><Text style={styles.metricValue}>{metrics.newToday}</Text><Text style={styles.metricText}>Mới hôm nay</Text></View>
        <View style={styles.metric}><Text style={styles.metricValue}>{metrics.returningToday}</Text><Text style={styles.metricText}>Quay lại</Text></View>
        <View style={styles.metric}><Text style={styles.metricValue}>{metrics.atRiskCount}</Text><Text style={styles.metricText}>Có nguy cơ</Text></View>
        <View style={styles.metric}><Text style={styles.metricValue}>{metrics.repeat30}%</Text><Text style={styles.metricText}>Quay lại 30 ngày</Text></View>
      </View>

      <View style={styles.card}>
        <View style={styles.header}><Text style={styles.title}>Bộ lọc CRM</Text><Pressable style={styles.button} onPress={applyFilters}><Text style={styles.buttonText}>{loading ? "Đang tải..." : "Làm mới"}</Text></Pressable></View>
        <View style={styles.grid}>
          <SelectField value={statusLabelSelected} onPress={() => setShowStatusSheet(true)} />
          <SelectField value={sourceLabelSelected} onPress={() => setShowSourceSheet(true)} />
          <SelectField value={dormantLabelSelected} onPress={() => setShowDormantSheet(true)} />
          <Pressable style={styles.selectField} onPress={() => setDraftVipOnly((current) => !current)}><Text style={styles.selectValue}>{draftVipOnly ? "Chỉ VIP: Bật" : "Chỉ VIP: Tắt"}</Text><Feather name={draftVipOnly ? "check-square" : "square"} size={16} color={palette.sub} /></Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.header}><Text style={styles.title}>Danh sách khách ({rows.length})</Text><Pressable style={styles.button} onPress={() => setListExpanded((current) => !current)}><Text style={styles.buttonText}>{listExpanded ? "Thu gọn" : "Mở rộng"}</Text></Pressable></View>
        {listExpanded ? (
          <>
            <Input value={draftSearch} onChangeText={setDraftSearch} placeholder="Tìm theo tên, số điện thoại..." />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            {loading ? <View style={styles.empty}><ActivityIndicator color={palette.accent} /><Text style={styles.sub}>Đang tải danh sách khách...</Text></View> : rows.length === 0 ? <View style={styles.empty}><Text style={styles.sub}>Không có khách nào khớp bộ lọc hiện tại.</Text></View> : <View style={styles.stack}>{rows.map((item) => <CustomerRow key={item.id} item={item} onPress={() => void loadCustomerDetail(item.id)} />)}</View>}
          </>
        ) : <View style={styles.empty}><Text style={styles.sub}>Danh sách CRM đang được thu gọn.</Text></View>}
      </View>

      <OptionSheet title="Chọn trạng thái" options={STATUS_OPTIONS} selected={draftStatus} onSelect={setDraftStatus} onClose={() => setShowStatusSheet(false)} visible={showStatusSheet} />
      <OptionSheet title="Chọn nguồn khách" options={sourceOptions} selected={draftSource} onSelect={setDraftSource} onClose={() => setShowSourceSheet(false)} visible={showSourceSheet} />
      <OptionSheet title="Chọn khoảng theo dõi" options={DORMANT_DAY_OPTIONS} selected={draftDormantDays} onSelect={setDraftDormantDays} onClose={() => setShowDormantSheet(false)} visible={showDormantSheet} />
      <OptionSheet title="Chọn ngày chăm sóc lại" options={followUpDateOptions} selected={detailFollowUpDate} onSelect={setDetailFollowUpDate} onClose={() => setShowFollowUpDateSheet(false)} visible={showFollowUpDateSheet} />
      <OptionSheet title="Chọn giờ chăm sóc lại" options={FOLLOW_UP_TIME_OPTIONS.map((value) => ({ label: value, value }))} selected={detailFollowUpTime} onSelect={setDetailFollowUpTime} onClose={() => setShowFollowUpTimeSheet(false)} visible={showFollowUpTimeSheet} />

      <Modal transparent animationType="fade" visible={branchModalOpen}>
        <Pressable style={styles.overlay} onPress={() => setBranchModalOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetHeader}><Text style={styles.sheetTitle}>Chọn chi nhánh</Text><Pressable onPress={() => setBranchModalOpen(false)}><Feather name="x" size={18} color={palette.text} /></Pressable></View>
            {branchOptions.map((branch) => (
              <Pressable key={branch.id} style={[styles.option, branch.id === branchId ? styles.optionActive : null]} onPress={() => void handleBranchChange(branch.id)}>
                <Text style={styles.optionText}>{branch.name}</Text>
                {branch.id === branchId ? <Feather name="check" size={16} color={palette.accent} /> : null}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal transparent animationType="fade" visible={Boolean(selectedCustomerId)}>
        <Pressable style={styles.overlay} onPress={closeDetail}>
          <Pressable style={styles.detail} onPress={() => {}}>
            <View style={styles.sheetHeader}><Text style={styles.sheetTitle}>Chi tiết khách</Text><Pressable onPress={closeDetail}><Feather name="x" size={18} color={palette.text} /></Pressable></View>
            {detailLoading ? (
              <View style={styles.empty}><ActivityIndicator color={palette.accent} /><Text style={styles.sub}>Đang tải chi tiết CRM...</Text></View>
            ) : detailError ? (
              <View style={styles.empty}><Text style={styles.error}>{detailError}</Text></View>
            ) : detail ? (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailScroll}>
                <Text style={styles.detailName}>{detail.customer.fullName}</Text>
                <View style={styles.detailMetrics}>
                  <View style={styles.detailMetric}><Text style={styles.detailMetricValue}>{detail.customer.totalVisits}</Text><Text style={styles.detailMetricText}>Lượt đến</Text></View>
                  <View style={styles.detailMetric}><Text style={styles.detailMetricValue}>{formatVnd(detail.customer.totalSpend)}</Text><Text style={styles.detailMetricText}>Tổng chi</Text></View>
                </View>

                <DetailSection title="Tổng quan">
                  <Text style={styles.detailLine}>Số điện thoại: {detail.customer.phone ?? "Chưa có"}</Text>
                  <Text style={styles.detailLine}>Trạng thái: {statusLabel(detail.customer.customerStatus)}</Text>
                  <Text style={styles.detailLine}>Nguồn: {sourceLabel(detail.customer.source)}</Text>
                  <Text style={styles.detailLine}>Dịch vụ gần nhất: {detail.customer.lastServiceSummary || "Chưa có dữ liệu"}</Text>
                  <Text style={styles.detailLine}>Sinh nhật: {formatDateOnly(detail.customer.birthday)}</Text>
                  <Text style={styles.detailLine}>Lần đầu: {formatDateTime(detail.customer.firstVisitAt)}</Text>
                  <Text style={styles.detailLine}>Lần gần nhất: {formatDateTime(detail.customer.lastVisitAt)}</Text>
                  <Text style={styles.detailLine}>Lịch chăm sóc tiếp theo: {formatDateTime(detail.customer.nextFollowUpAt)}</Text>
                  <Text style={styles.detailLine}>Liên hệ gần nhất: {formatDateTime(detail.customer.lastContactedAt)}</Text>
                  <Text style={styles.detailLine}>Tags: {detail.customer.tags.length ? detail.customer.tags.join(", ") : "Chưa có tags"}</Text>
                  <Text style={styles.detailLine}>Ghi chú: {detail.customer.careNote || "Chưa có ghi chú"}</Text>
                </DetailSection>

                <DetailSection title={`Lịch hẹn (${detail.appointments.length})`}>
                  {detail.appointments.length ? detail.appointments.map((appointment) => (
                    <View key={appointment.id} style={styles.detailItem}>
                      <Text style={styles.detailItemTitle}>{appointmentLabel(appointment)}</Text>
                      <Text style={styles.detailItemMeta}>Mã lịch: {appointment.id}</Text>
                    </View>
                  )) : <DetailEmpty text="Khách này chưa có lịch hẹn." />}
                </DetailSection>

                <DetailSection title={`Hoa don (${detail.tickets.length})`}>
                  {detail.tickets.length ? detail.tickets.map((ticket) => (
                    <View key={ticket.id} style={styles.detailItem}>
                      <Text style={styles.detailItemTitle}>{ticket.status || "Không rõ trạng thái"} - {formatTicketTotal(ticket)}</Text>
                      <Text style={styles.detailItemMeta}>{formatDateTime(ticket.createdAt)}</Text>
                    </View>
                  )) : <DetailEmpty text="Khách này chưa có hóa đơn." />}
                </DetailSection>

                <DetailSection title={`Yêu cầu đặt lịch (${detail.bookingRequests.length})`}>
                  {detail.bookingRequests.length ? detail.bookingRequests.map((booking) => (
                    <View key={booking.id} style={styles.detailItem}>
                      <Text style={styles.detailItemTitle}>{bookingLabel(booking)}</Text>
                      <Text style={styles.detailItemMeta}>{booking.status} · {sourceLabel(booking.source)}</Text>
                    </View>
                  )) : <DetailEmpty text="Không có yêu cầu đặt lịch gần đây." />}
                </DetailSection>

                <DetailSection title={`Timeline CRM (${detail.activities.length})`}>
                  {detail.activities.length ? detail.activities.map((activity) => (
                    <View key={activity.id} style={styles.detailItem}>
                      <Text style={styles.detailItemTitle}>{activityTypeLabel(activity.type)}</Text>
                      <Text style={styles.detailItemMeta}>{formatDateTime(activity.createdAt)}{activity.channel ? ` · ${activity.channel}` : ""}</Text>
                      <Text style={styles.detailLine}>{activity.contentSummary || "Không có nội dung"}</Text>
                    </View>
                  )) : <DetailEmpty text="Chưa có lịch sử chăm sóc CRM." />}
                </DetailSection>

                <DetailSection title="Thao tác nhanh">
                  <Pressable
                    style={styles.secondaryButton}
                    onPress={() => router.push({ pathname: "/(admin)/scheduling", params: { customer: detail.customer.fullName } })}
                  >
                    <Text style={styles.secondaryButtonText}>Tạo lịch mới cho khách này</Text>
                  </Pressable>
                  {detail.customer.phone ? (
                    <Pressable style={styles.secondaryButton} onPress={() => void Linking.openURL(`tel:${detail.customer.phone}`)}>
                      <Text style={styles.secondaryButtonText}>Gọi khách</Text>
                    </Pressable>
                  ) : null}
                  <Pressable style={styles.secondaryButtonSoft} onPress={() => telegramReminderUrl ? void Linking.openURL(telegramReminderUrl) : undefined}>
                    <Text style={styles.secondaryButtonSoftText}>Mở Telegram để nhắc chăm sóc</Text>
                  </Pressable>
                </DetailSection>

                <DetailSection title="Ghi chú chăm sóc">
                  <View style={styles.grid}>
                    <SelectField value={followUpDateLabel} onPress={() => setShowFollowUpDateSheet(true)} />
                    <SelectField value={detailFollowUpTime} onPress={() => setShowFollowUpTimeSheet(true)} />
                  </View>
                  {detailFollowUpDate ? (
                    <Pressable style={styles.ghostButton} onPress={() => setDetailFollowUpDate("")}>
                      <Text style={styles.ghostButtonText}>Bỏ lịch chăm sóc tiếp theo</Text>
                    </Pressable>
                  ) : null}
                  <Input
                    value={detailNote}
                    onChangeText={setDetailNote}
                    placeholder="Lưu ý phục vụ, thói quen và lịch chăm sóc lại..."
                    multiline
                    style={styles.textarea}
                  />
                  <Input
                    value={detailTags}
                    onChangeText={setDetailTags}
                    placeholder="Tag, phân cách bằng dấu phẩy"
                  />
                  <Pressable style={[styles.primaryButton, detailSaving ? styles.primaryButtonDisabled : null]} disabled={detailSaving} onPress={() => void saveDetailNote()}>
                    <Text style={styles.primaryButtonText}>{detailSaving ? "Đang lưu..." : "Lưu ghi chú CRM"}</Text>
                  </Pressable>
                </DetailSection>
              </ScrollView>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </ManageScreenShell>
  );
}

const styles = StyleSheet.create({
  ...manageStyles,
  card: { borderRadius: 18, borderWidth: 1, borderColor: palette.border, backgroundColor: "#FFFFFF", padding: 14, gap: 12 },
  total: { fontSize: 20, fontWeight: "800", color: palette.text },
  sub: { fontSize: 12, lineHeight: 17, color: palette.sub, textAlign: "center" },
  metricRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metric: { width: "47%", borderRadius: 16, borderWidth: 1, borderColor: palette.border, backgroundColor: "#FCFAF8", padding: 10, gap: 4 },
  metricValue: { fontSize: 18, fontWeight: "800", color: palette.text },
  metricText: { fontSize: 11, color: palette.sub },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  title: { flex: 1, fontSize: 16, fontWeight: "800", color: palette.text },
  button: { minHeight: 32, borderRadius: 16, paddingHorizontal: 10, borderWidth: 1, borderColor: palette.border, alignItems: "center", justifyContent: "center" },
  buttonText: { fontSize: 12, fontWeight: "700", color: palette.sub },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  selectField: { width: "47%", minHeight: 46, borderRadius: 14, borderWidth: 1, borderColor: palette.border, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  selectValue: { flex: 1, fontSize: 13, color: palette.text },
  input: { minHeight: 46, borderRadius: 14, borderWidth: 1, borderColor: palette.border, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: palette.text },
  error: { fontSize: 12, lineHeight: 17, color: "#C66043" },
  empty: { borderRadius: 16, borderWidth: 1, borderStyle: "dashed", borderColor: palette.border, backgroundColor: palette.mutedSoft, padding: 18, alignItems: "center", gap: 8 },
  stack: { gap: 12 },
  row: { borderRadius: 18, borderWidth: 1, borderColor: palette.border, backgroundColor: "#FFFFFF", paddingHorizontal: 12, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#F2DDD4", alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 13, fontWeight: "800", color: "#8A5947" },
  copy: { flex: 1, gap: 6 },
  name: { fontSize: 14, fontWeight: "800", color: palette.text },
  meta: { fontSize: 11, lineHeight: 14, color: palette.sub },
  badge: { fontSize: 10, fontWeight: "800", color: palette.accent },
  overlay: { flex: 1, backgroundColor: "rgba(47,36,29,0.28)", paddingHorizontal: 20, alignItems: "center", justifyContent: "center" },
  sheet: { width: "100%", maxWidth: 360, borderRadius: 24, backgroundColor: "#FFFFFF", padding: 16, gap: 8 },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  sheetTitle: { fontSize: 18, fontWeight: "800", color: palette.text },
  option: { minHeight: 46, borderRadius: 14, borderWidth: 1, borderColor: palette.border, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  optionActive: { backgroundColor: "#FFF8EF", borderColor: "#D8BEA2" },
  optionText: { flex: 1, fontSize: 14, color: palette.text },
  detail: { width: "100%", maxWidth: 380, maxHeight: "86%", borderRadius: 24, backgroundColor: "#FFFFFF", padding: 16, gap: 8 },
  detailScroll: { gap: 12, paddingBottom: 8 },
  detailName: { fontSize: 18, fontWeight: "800", color: palette.text },
  detailLine: { fontSize: 13, lineHeight: 18, color: palette.text },
  detailMetrics: { flexDirection: "row", gap: 10 },
  detailMetric: { flex: 1, borderRadius: 14, borderWidth: 1, borderColor: palette.border, backgroundColor: "#FCFAF8", padding: 10, gap: 4 },
  detailMetricValue: { fontSize: 16, fontWeight: "800", color: palette.text },
  detailMetricText: { fontSize: 11, color: palette.sub },
  detailSection: { gap: 8 },
  detailSectionTitle: { fontSize: 14, fontWeight: "800", color: palette.text },
  detailSectionBody: { gap: 8 },
  detailItem: { borderRadius: 14, borderWidth: 1, borderColor: palette.border, backgroundColor: "#FCFAF8", padding: 10, gap: 4 },
  detailItemTitle: { fontSize: 13, fontWeight: "700", color: palette.text },
  detailItemMeta: { fontSize: 11, color: palette.sub },
  detailEmpty: { fontSize: 12, lineHeight: 17, color: palette.sub },
  textarea: { minHeight: 96, textAlignVertical: "top" },
  primaryButton: { minHeight: 44, borderRadius: 14, backgroundColor: palette.accent, alignItems: "center", justifyContent: "center", paddingHorizontal: 14 },
  primaryButtonDisabled: { opacity: 0.6 },
  primaryButtonText: { fontSize: 13, fontWeight: "800", color: "#FFFFFF" },
  secondaryButton: { minHeight: 44, borderRadius: 14, borderWidth: 1, borderColor: palette.border, alignItems: "center", justifyContent: "center", paddingHorizontal: 14, backgroundColor: "#FFFFFF" },
  secondaryButtonText: { fontSize: 13, fontWeight: "700", color: palette.text },
  secondaryButtonSoft: { minHeight: 44, borderRadius: 14, borderWidth: 1, borderColor: "#D7E6F5", alignItems: "center", justifyContent: "center", paddingHorizontal: 14, backgroundColor: "#F2F8FE" },
  secondaryButtonSoftText: { fontSize: 13, fontWeight: "700", color: "#2E6EA6" },
  ghostButton: { alignSelf: "flex-start", minHeight: 32, borderRadius: 14, paddingHorizontal: 12, alignItems: "center", justifyContent: "center", backgroundColor: palette.mutedSoft },
  ghostButtonText: { fontSize: 12, fontWeight: "700", color: palette.sub },
  branchName: { fontSize: 16, fontWeight: "800", color: palette.text },
  branchHint: { fontSize: 12, lineHeight: 17, color: palette.sub },
});
