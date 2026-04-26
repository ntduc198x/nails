import { useEffect } from "react";
import { useLocalSearchParams } from "expo-router";
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { CustomerScreen, CustomerTopActions, Pill, PrimaryButton, SurfaceCard } from "@/src/features/customer/ui";
import { QUICK_CONTACTS, UPCOMING_BOOKINGS } from "@/src/features/customer/data";
import { useGuestBooking } from "@/src/hooks/use-guest-booking";
import { premiumTheme } from "@/src/design/premium-theme";

const { colors, spacing } = premiumTheme;

export default function BookingScreen() {
  const params = useLocalSearchParams<{ service?: string }>();
  const { dateOptions, fieldErrors, isSubmitting, submit, submitError, successResult, timeSlots, updateValue, values } =
    useGuestBooking();

  useEffect(() => {
    if (params.service && typeof params.service === "string" && params.service !== values.requestedService) {
      updateValue("requestedService", params.service);
    }
  }, [params.service, updateValue, values.requestedService]);

  return (
    <CustomerScreen title="" hideHeader contentContainerStyle={styles.content} onRefresh={() => {}} refreshing={false}>
      <View style={styles.topBar}>
        <View style={styles.topBarSpacer} />
        <CustomerTopActions />
      </View>

      <View style={styles.headerBlock}>
        <Text style={styles.eyebrow}>CHAM BEAUTY</Text>
        <Text style={styles.pageTitle}>Đặt lịch</Text>
        <Text style={styles.pageSubtitle}>Chọn mẫu nail, thời gian và thông tin liên hệ theo phong cách đồng nhất của customer flow.</Text>
      </View>

      <SurfaceCard style={styles.formCard}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Thông tin yêu cầu</Text>
          <Text style={styles.sectionSubtitle}>Điền nhanh để salon giữ chỗ chính xác hơn.</Text>
        </View>

        <FieldBlock label="Mẫu nail" error={fieldErrors.requestedService}>
          <TextInput
            placeholder="Luxury Gel, French Chic..."
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            value={values.requestedService}
            onChangeText={(value) => updateValue("requestedService", value)}
          />
        </FieldBlock>

        <FieldBlock label="Ngày hẹn" error={fieldErrors.selectedDate}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {dateOptions.map((option) => (
              <Pill
                key={option.value}
                label={option.label}
                active={option.value === values.selectedDate}
                onPress={() => updateValue("selectedDate", option.value)}
              />
            ))}
          </ScrollView>
        </FieldBlock>

        <FieldBlock label="Khung giờ" error={fieldErrors.selectedTime}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {timeSlots.map((slot) => (
              <Pill
                key={slot}
                label={slot}
                active={slot === values.selectedTime}
                onPress={() => updateValue("selectedTime", slot)}
              />
            ))}
          </ScrollView>
        </FieldBlock>

        <FieldBlock label="Tên khách hàng" error={fieldErrors.customerName}>
          <TextInput
            placeholder="Nguyễn Khánh Ly"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            value={values.customerName}
            onChangeText={(value) => updateValue("customerName", value)}
          />
        </FieldBlock>

        <FieldBlock label="Số điện thoại" error={fieldErrors.customerPhone}>
          <TextInput
            keyboardType="phone-pad"
            placeholder="0916 080 398"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            value={values.customerPhone}
            onChangeText={(value) => updateValue("customerPhone", value)}
          />
        </FieldBlock>

        <FieldBlock label="Kỹ thuật viên ưu tiên">
          <TextInput
            placeholder="Ví dụ: Bùi Thị Tuyết"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            value={values.preferredStaff}
            onChangeText={(value) => updateValue("preferredStaff", value)}
          />
        </FieldBlock>

        <FieldBlock label="Ghi chú">
          <TextInput
            multiline
            numberOfLines={4}
            placeholder="Màu sắc, nail art, lưu ý đặc biệt..."
            placeholderTextColor={colors.textMuted}
            style={[styles.input, styles.noteInput]}
            textAlignVertical="top"
            value={values.note}
            onChangeText={(value) => updateValue("note", value)}
          />
        </FieldBlock>

        {submitError ? <Text style={styles.errorText}>{submitError}</Text> : null}
        {successResult ? (
          <SurfaceCard style={styles.successCard}>
            <Text style={styles.successTitle}>Đã gửi yêu cầu thành công</Text>
            <Text style={styles.successText}>{successResult.bookingRequestId ?? "Đang đồng bộ mã booking"}</Text>
          </SurfaceCard>
        ) : null}

        <PrimaryButton label={isSubmitting ? "Đang gửi..." : "Gửi yêu cầu"} onPress={() => void submit()} />
      </SurfaceCard>

      <SurfaceCard style={styles.utilityCard}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Liên hệ nhanh</Text>
          <Text style={styles.sectionSubtitle}>Khi bạn cần tư vấn mẫu hoặc giữ chỗ gấp.</Text>
        </View>

        <View style={styles.contactList}>
          {QUICK_CONTACTS.map((item) => (
            <Pressable key={item.label} style={styles.contactRow} onPress={() => void Linking.openURL(item.href)}>
              <View style={styles.contactCopy}>
                <Text style={styles.contactLabel}>{item.label}</Text>
                <Text style={styles.contactValue}>{item.value}</Text>
              </View>
              <Text style={styles.contactAction}>{item.actionLabel}</Text>
            </Pressable>
          ))}
        </View>
      </SurfaceCard>

      <SurfaceCard style={styles.utilityCard}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Lịch đã giữ cho bạn</Text>
          <Text style={styles.sectionSubtitle}>Các lịch gần nhất đang được hiển thị cùng phong cách với toàn app.</Text>
        </View>

        <View style={styles.bookingList}>
          {UPCOMING_BOOKINGS.map((item) => (
            <View key={item.id} style={styles.bookingRow}>
              <View style={styles.bookingCopy}>
                <Text style={styles.bookingTitle}>{item.title}</Text>
                <Text style={styles.bookingMeta}>{item.slot}</Text>
                <Text style={styles.bookingMeta}>{item.staff}</Text>
              </View>
              <PrimaryButton label="Sửa" subtle />
            </View>
          ))}
        </View>
      </SurfaceCard>
    </CustomerScreen>
  );
}

function FieldBlock({
  children,
  error,
  label,
}: {
  children: React.ReactNode;
  error?: string;
  label: string;
}) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
    paddingTop: 2,
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  topBarSpacer: {
    flex: 1,
  },
  headerBlock: {
    gap: 6,
  },
  eyebrow: {
    color: "#544335",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 1.6,
  },
  pageTitle: {
    color: colors.text,
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.8,
  },
  pageSubtitle: {
    color: colors.textSoft,
    fontSize: 14,
    lineHeight: 21,
  },
  formCard: {
    gap: 18,
  },
  utilityCard: {
    gap: 18,
  },
  sectionHead: {
    gap: 4,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  sectionSubtitle: {
    color: colors.textSoft,
    fontSize: 13,
    lineHeight: 19,
  },
  fieldBlock: {
    gap: 8,
  },
  fieldLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  noteInput: {
    minHeight: 112,
  },
  chipRow: {
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  errorText: {
    color: colors.dangerText,
    fontSize: 13,
    lineHeight: 19,
  },
  successCard: {
    backgroundColor: colors.successBg,
    borderColor: colors.successBg,
    gap: 4,
  },
  successTitle: {
    color: colors.successText,
    fontSize: 16,
    fontWeight: "800",
  },
  successText: {
    color: colors.successText,
    fontSize: 13,
  },
  contactList: {
    gap: 12,
  },
  contactRow: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderRadius: 18,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  contactCopy: {
    flex: 1,
    gap: 4,
  },
  contactLabel: {
    color: colors.textSoft,
    fontSize: 12,
    fontWeight: "700",
  },
  contactValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  contactAction: {
    color: "#a7744d",
    fontSize: 13,
    fontWeight: "800",
  },
  bookingList: {
    gap: 12,
  },
  bookingRow: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderRadius: 18,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  bookingCopy: {
    flex: 1,
    gap: 4,
  },
  bookingTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  bookingMeta: {
    color: colors.textSoft,
    fontSize: 13,
  },
});
