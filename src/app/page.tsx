export default function LandingPage() {
  const featuredNews = [
    {
      tag: "Phân tích",
      title: "Open-source AI đang thay đổi cuộc chơi sản phẩm như thế nào",
      desc: "Tổng hợp những framework và mô hình nguồn mở đang được startup ứng dụng mạnh nhất trong 2026.",
    },
    {
      tag: "Xu hướng",
      title: "AI agents bước vào giai đoạn vận hành thực chiến",
      desc: "Từ trợ lý nội bộ đến workflow automation, AI agents đang chuyển từ demo sang production nhanh hơn dự đoán.",
    },
  ];

  const latestNews = [
    {
      category: "Machine Learning",
      title: "Mô hình nhỏ nhưng hiệu quả: hướng đi mới cho doanh nghiệp vừa và nhỏ",
      desc: "Doanh nghiệp không còn cần hạ tầng khổng lồ để triển khai AI có giá trị.",
    },
    {
      category: "Automation",
      title: "Tự động hóa quy trình nội bộ với AI: tiết kiệm thời gian hay thêm rủi ro?",
      desc: "Một góc nhìn cân bằng về tốc độ triển khai, chi phí vận hành và kiểm soát chất lượng.",
    },
    {
      category: "LLM",
      title: "Cuộc đua mô hình ngôn ngữ 2026: chất lượng, giá thành và khả năng tích hợp",
      desc: "So sánh nhanh các xu hướng nổi bật mà team sản phẩm và kỹ thuật nên để mắt tới.",
    },
    {
      category: "Computer Vision",
      title: "Vision AI đang đi xa hơn giám sát: retail, beauty và vận hành cửa hàng",
      desc: "Ứng dụng nhận diện hình ảnh đang mở ra các case thực chiến gần người dùng hơn bao giờ hết.",
    },
    {
      category: "Data",
      title: "RAG không còn là trend, mà là tầng dữ liệu bắt buộc cho AI app tử tế",
      desc: "Nếu làm AI product mà chưa có chiến lược retrieval rõ ràng, sớm muộn cũng đuối.",
    },
    {
      category: "TikTok Ecosystem",
      title: "TikTok login, creator tools và AI-driven personalization đang hội tụ",
      desc: "Một bức tranh mới cho các nền tảng nội dung muốn tăng giữ chân người dùng.",
    },
  ];

  return (
    <main className="ai-landing-page">
      <div className="ai-bg-effects" aria-hidden="true">
        <div className="ai-bg-glow ai-bg-glow--top" />
        <div className="ai-bg-glow ai-bg-glow--bottom" />
        <div className="ai-bg-grid" />
      </div>

      <nav className="ai-nav">
        <div className="ai-nav__inner">
          <a href="#home" className="ai-brand">
            <span className="ai-brand__logo">CPU</span>
            <span className="ai-brand__text">ChamBeauty <span>AI</span></span>
          </a>

          <div className="ai-nav__links">
            <a href="#home">Trang chủ</a>
            <a href="/policy">Chính sách</a>
            <a href="/terms">Điều khoản</a>
          </div>

          <a href="#cta" className="ai-nav__cta">TikTok Login</a>
        </div>
      </nav>

      <section id="home" className="ai-hero">
        <div className="ai-hero__content">
          <div className="ai-pill">Cập nhật AI mới nhất — 2026</div>
          <h1>
            <span>Tin tức AI</span>
            <br />
            <em>&amp; Công nghệ</em>
          </h1>
          <p>
            ChamBeauty AI — Nền tảng tổng hợp tin tức trí tuệ nhân tạo, machine learning và công nghệ tiên tiến.
            Cập nhật mỗi ngày, dành cho người Việt.
          </p>
          <div className="ai-hero__actions">
            <a href="#news-section" className="ai-btn ai-btn--primary">Khám phá ngay</a>
            <a href="#cta" className="ai-btn ai-btn--secondary">Đăng nhập với TikTok</a>
          </div>
        </div>
      </section>

      <section className="ai-stats">
        <div className="ai-stats__grid">
          <div className="ai-stat-card"><strong>500+</strong><span>Bài viết AI</span></div>
          <div className="ai-stat-card"><strong>50K+</strong><span>Lượt đọc/tháng</span></div>
          <div className="ai-stat-card"><strong>24/7</strong><span>Cập nhật liên tục</span></div>
          <div className="ai-stat-card"><strong>100%</strong><span>Miễn phí</span></div>
        </div>
      </section>

      <section className="ai-featured">
        <div className="ai-section-head">
          <h2>Nổi bật</h2>
          <span>Featured</span>
        </div>

        <div className="ai-featured__grid">
          {featuredNews.map((item) => (
            <article key={item.title} className="ai-card ai-card--featured">
              <span className="ai-card__tag">{item.tag}</span>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
              <a href="#news-section">Đọc thêm →</a>
            </article>
          ))}
        </div>
      </section>

      <section id="news-section" className="ai-news-section">
        <div className="ai-section-head">
          <h2>Tin tức AI mới nhất</h2>
          <span>Latest</span>
        </div>

        <div className="ai-news-grid">
          {latestNews.map((item) => (
            <article key={item.title} className="ai-card ai-card--news">
              <span className="ai-news__category">{item.category}</span>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
              <div className="ai-news__meta">
                <span>Cập nhật hôm nay</span>
                <a href="#cta">Lưu bài viết</a>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="cta" className="ai-cta-section">
        <div className="ai-cta-card">
          <div className="ai-cta-glow" />
          <div className="ai-cta-card__content">
            <span className="ai-cta-icon">★</span>
            <h2>Lưu bài viết yêu thích</h2>
            <p>
              Đăng nhập với TikTok để lưu các bài AI news bạn quan tâm và nhận gợi ý cá nhân hóa.
            </p>
            <a href="#" className="ai-btn ai-btn--tiktok">Đăng nhập với TikTok</a>
          </div>
        </div>
      </section>
    </main>
  );
}
