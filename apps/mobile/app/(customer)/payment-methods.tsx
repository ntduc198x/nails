import { PAYMENT_METHODS } from "@/src/features/customer/data";
import { CustomerScreen, InfoRow, SectionTitle, SurfaceCard } from "@/src/features/customer/ui";

export default function PaymentMethodsScreen() {
  return (
    <CustomerScreen title="Phương thức thanh toán" subtitle="Danh sách phương thức thanh toán đang hỗ trợ" onRefresh={() => {}} refreshing={false}>
      <SurfaceCard>
        <SectionTitle title="Phương thức đang hỗ trợ" subtitle="Sẵn sàng cho luồng đặt lịch và thanh toán" />
        {PAYMENT_METHODS.map((item) => (
          <InfoRow key={item.id} title={item.title} detail={item.detail} />
        ))}
      </SurfaceCard>
    </CustomerScreen>
  );
}
