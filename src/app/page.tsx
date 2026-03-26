"use client";

import { createPublicBookingRequest } from "@/lib/landing-booking";
import { useMemo, useState } from "react";

type BookingForm = {
  customerName: string;
  phone: string;
  service: string;
  preferredStaff: string;
  date: string;
  time: string;
  note: string;
};

const initialForm: BookingForm = {
  customerName: "",
  phone: "",
  service: "",
  preferredStaff: "",
  date: "",
  time: "",
  note: "",
};

function buildAppointmentWindow(date: string, time: string) {
  const start = new Date(`${date}T${time}`);
  if (Number.isNaN(start.getTime())) {
    throw new Error("Ngày giờ hẹn chưa hợp lệ.");
  }
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  return { start, end };
}

export default function LandingPage() {
  const services = useMemo(
    () => [
      {
        title: "Luxury Gel",
        description: "Sơn gel cao cấp, bền màu lên đến 3 tuần.",
        price: "350.000đ",
        value: "Luxury Gel",
        image: "https://images.unsplash.com/photo-1604654894610-df63bc536371?q=80&w=800",
      },
      {
        title: "Nail Art Design",
        description: "Vẽ móng nghệ thuật, đính đá phong cách Red Carpet.",
        price: "500.000đ",
        value: "Nail Art Design",
        image: "https://images.unsplash.com/photo-1607779097040-26e80aa78e66?q=80&w=800",
      },
      {
        title: "Spa & Care",
        description: "Chăm sóc da tay, tẩy da chết và trị liệu dưỡng chất.",
        price: "400.000đ",
        value: "Spa & Care",
        image: "https://images.unsplash.com/photo-1519014816548-bf5fe059798b?q=80&w=800",
      },
    ],
    [],
  );

  const [form, setForm] = useState<BookingForm>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function updateField<K extends keyof BookingForm>(key: K, value: BookingForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;

    try {
      setSubmitting(true);
      setMessage(null);

      const { start, end } = buildAppointmentWindow(form.date, form.time);
      await createPublicBookingRequest({
        customerName: form.customerName.trim(),
        customerPhone: form.phone.trim(),
        requestedService: form.service.trim() || undefined,
        preferredStaff: form.preferredStaff.trim() || undefined,
        note: form.note.trim() || undefined,
        requestedStartAt: start.toISOString(),
        requestedEndAt: end.toISOString(),
        source: "landing_page",
      });

      setForm(initialForm);
      setMessage({
        type: "success",
        text: "Đã ghi nhận yêu cầu đặt lịch. Chạm Beauty sẽ liên hệ xác nhận trong thời gian sớm nhất.",
      });
    } catch (error) {
      const text = error instanceof Error ? error.message : "Không gửi được yêu cầu đặt lịch.";
      setMessage({ type: "error", text });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="landing-page">
      <header className="landing-site-header">
        <div className="landing-site-header__inner">
          <div className="landing-logo">
            <span className="landing-logo__main">Chạm</span>
            <span className="landing-logo__sub">Beauty</span>
          </div>

          <nav className="landing-nav-menu">
            <a href="#about">Câu chuyện</a>
            <a href="#services">Dịch vụ</a>
            <a href="#booking">Đặt lịch</a>
            <a href="https://m.me/chambeautyyy" target="_blank" rel="noreferrer">Liên hệ</a>
          </nav>
        </div>
      </header>

      <section id="hero" className="landing-hero-section">
        <div className="landing-hero-left">
          <span className="landing-hero-subtitle">High-End Nail Art Studio</span>
          <h1 className="landing-hero-title">CHẠM</h1>
          <h1 className="landing-hero-title landing-hero-title--filled">
            <span>BEAUTY</span>
          </h1>
          <p className="landing-hero-desc">
            Nơi mỗi đường nét là một sự chạm khẽ tinh tế.
            {"\n"}
            Chúng tôi không chỉ làm móng, chúng tôi kiến tạo phong cách cho đôi bàn tay của bạn.
          </p>
          <div className="landing-hero-actions">
            <a href="#booking" className="landing-btn-luxury">Đặt lịch ngay</a>
          </div>
        </div>
        <div className="landing-hero-right" />
      </section>

      <section id="about" className="landing-about-section">
        <div className="landing-bg-text">CHAM BEAUTY</div>
        <div className="landing-about-container">
          <div className="landing-about-content">
            <h2>
              Câu chuyện của <span>Chạm</span>
            </h2>
            <p>
              "Chạm" không chỉ là hành động vật lý, mà là sự giao thoa của cảm xúc.
              Tại <strong>Chạm Beauty</strong>, chúng tôi tin rằng đôi bàn tay là nơi lưu giữ câu chuyện của người phụ nữ.
            </p>
            <p>
              Với triết lý <em>"Less is More"</em>, mỗi thiết kế tại Chạm đều hướng đến sự tinh tế,
              loại bỏ những chi tiết thừa thãi để tôn lên vẻ đẹp tự nhiên và sang trọng vốn có của bạn.
            </p>
            <div className="landing-about-metric">
              <span className="landing-about-metric__value">05+</span>
              <span className="landing-about-metric__label">Năm kinh nghiệm</span>
            </div>
          </div>

          <div className="landing-about-img-stack">
            <img src="https://images.unsplash.com/photo-1519014816548-bf5fe059798b?q=80&w=600" className="img-top" alt="Nail Art Detail" />
            <img src="https://images.unsplash.com/photo-1604654894610-df63bc536371?q=80&w=600" className="img-bottom" alt="Nail Salon" />
          </div>
        </div>
      </section>

      <section id="services" className="landing-services-section">
        <div className="landing-section-header">
          <p className="landing-section-eyebrow">Lookbook</p>
          <div className="landing-section-line" />
          <h2>Các dịch vụ nổi bật</h2>
        </div>

        <div className="landing-services-grid">
          {services.map((service) => (
            <article key={service.title} className="landing-service-card">
              <div className="landing-service-img-wrapper">
                <img src={service.image} alt={service.title} />
              </div>
              <div className="landing-service-info">
                <h3>{service.title}</h3>
                <p>{service.description}</p>
                <span className="landing-service-price">{service.price}</span>
                <a href="#booking" className="landing-btn-service-book" onClick={() => updateField("service", service.value)}>
                  Đặt lịch ngay
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="booking" className="landing-booking-section">
        <div className="landing-booking-wrapper">
          <div className="landing-booking-info">
            <h2>
              Sẵn sàng <span>chạm</span>?
            </h2>
            <p>
              Đừng để vẻ đẹp phải chờ đợi. Hãy để lại thông tin,
              Chạm Beauty sẽ liên hệ xác nhận lịch hẹn của bạn trong thời gian sớm nhất.
            </p>
            <p className="landing-booking-quote">"Vẻ đẹp bắt đầu từ sự chăm sóc"</p>

            <div className="landing-booking-contact-item">📍 <span>38A ngách: 358/40 Bùi Xương Trạch, Khương Định</span></div>
            <div className="landing-booking-contact-item">📞 <span>0916.080398 - 0966.742573</span></div>
            <div className="landing-booking-contact-item">🕘 <span>09:00 - 21:00 (T2 - CN)</span></div>
          </div>

          <form className="landing-booking-form-detailed" onSubmit={onSubmit}>
            <div className="landing-form-group">
              <label>Họ và tên *</label>
              <input type="text" placeholder="Nguyễn Thị A" value={form.customerName} onChange={(e) => updateField("customerName", e.target.value)} required />
            </div>

            <div className="landing-form-group">
              <label>Số điện thoại *</label>
              <input type="tel" placeholder="0909 xxx xxx" value={form.phone} onChange={(e) => updateField("phone", e.target.value)} required />
            </div>

            <div className="landing-form-group">
              <label>Dịch vụ mong muốn</label>
              <select value={form.service} onChange={(e) => updateField("service", e.target.value)} required>
                <option value="">Chọn dịch vụ</option>
                {services.map((service) => (
                  <option key={service.value} value={service.value}>{service.value}</option>
                ))}
                <option value="Gỡ móng & Chăm sóc">Gỡ móng & Chăm sóc</option>
              </select>
            </div>

            <div className="landing-form-group">
              <label>Thợ chỉ định (Nếu có)</label>
              <input type="text" placeholder="VD: Thợ Loan" value={form.preferredStaff} onChange={(e) => updateField("preferredStaff", e.target.value)} />
            </div>

            <div className="landing-form-group">
              <label>Ngày hẹn *</label>
              <input type="date" value={form.date} onChange={(e) => updateField("date", e.target.value)} required />
            </div>

            <div className="landing-form-group">
              <label>Giờ hẹn *</label>
              <input type="time" value={form.time} onChange={(e) => updateField("time", e.target.value)} required />
            </div>

            <div className="landing-form-group full-width">
              <label>Ghi chú thêm</label>
              <textarea placeholder="Mô tả mẫu mong muốn hoặc lưu ý đặc biệt..." value={form.note} onChange={(e) => updateField("note", e.target.value)} />
            </div>

            {message && (
              <div className={`landing-form-message ${message.type === "success" ? "success" : "error"}`}>
                {message.text}
              </div>
            )}

            <button type="submit" className="landing-btn-gold" disabled={submitting}>
              {submitting ? "Đang gửi yêu cầu..." : "Gửi yêu cầu đặt lịch"}
            </button>
          </form>
        </div>
      </section>

      <footer className="landing-footer">
        <p>38A ngách: 358/40 Bùi Xương Trạch, Khương Định</p>
        <div className="landing-social-icons">
          <a href="https://www.facebook.com/chambeautyyy" target="_blank" rel="noreferrer" aria-label="Facebook">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 21v-8.1h2.7l.4-3.2h-3.1V7.6c0-.9.2-1.6 1.6-1.6H16.7V3.1c-.3 0-1.3-.1-2.5-.1-2.5 0-4.1 1.5-4.1 4.4v2.4H7.5v3.2h2.6V21h3.4Z" fill="currentColor"/></svg>
          </a>
          <a href="#" aria-label="Instagram">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.8 3h8.4A4.8 4.8 0 0 1 21 7.8v8.4a4.8 4.8 0 0 1-4.8 4.8H7.8A4.8 4.8 0 0 1 3 16.2V7.8A4.8 4.8 0 0 1 7.8 3Zm0 1.8A3 3 0 0 0 4.8 7.8v8.4a3 3 0 0 0 3 3h8.4a3 3 0 0 0 3-3V7.8a3 3 0 0 0-3-3H7.8Zm8.85 1.35a1.05 1.05 0 1 1 0 2.1 1.05 1.05 0 0 1 0-2.1ZM12 7.5A4.5 4.5 0 1 1 7.5 12 4.5 4.5 0 0 1 12 7.5Zm0 1.8A2.7 2.7 0 1 0 14.7 12 2.7 2.7 0 0 0 12 9.3Z" fill="currentColor"/></svg>
          </a>
          <a href="#" aria-label="TikTok">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.9 3c.4 1.8 1.4 3.2 3.1 4.2 1 .6 2.1.9 3 .9v3.2c-1 0-2-.2-3-.5a8 8 0 0 1-2.3-1.2v6.2c0 3.1-2.6 5.6-5.8 5.6A5.7 5.7 0 0 1 4 15.8a5.7 5.7 0 0 1 5.9-5.6c.4 0 .8 0 1.2.1v3.2a2.8 2.8 0 0 0-1.2-.3 2.5 2.5 0 1 0 2.5 2.6V3h2.5Z" fill="currentColor"/></svg>
          </a>
        </div>
        <p>Hotline: 0916.080398 - 0966.742573</p>
      </footer>
    </main>
  );
}
