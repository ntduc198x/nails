import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
const telegramChatId = process.env.TELEGRAM_BOOKING_CHAT_ID;
const publicBaseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://thongdong.io.vn";

function getSupabase() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Thiếu cấu hình Supabase env.");
  }
  return createClient(supabaseUrl, supabaseAnonKey);
}

async function notifyTelegram(message: string) {
  if (!telegramBotToken || !telegramChatId) return { skipped: true };

  const res = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: telegramChatId,
      text: message,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Telegram notify failed: ${text}`);
  }

  return { skipped: false };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      customerName,
      customerPhone,
      requestedService,
      preferredStaff,
      note,
      requestedStartAt,
      requestedEndAt,
      source,
    } = body ?? {};

    const supabase = getSupabase();

    const { data, error } = await supabase.rpc("create_booking_request_public", {
      p_customer_name: customerName,
      p_customer_phone: customerPhone,
      p_requested_service: requestedService ?? null,
      p_preferred_staff: preferredStaff ?? null,
      p_note: note ?? null,
      p_requested_start_at: requestedStartAt,
      p_requested_end_at: requestedEndAt ?? null,
      p_source: source ?? "landing_page",
    });

    if (error) {
      const message = [error.message, (error as { details?: string }).details, (error as { hint?: string }).hint]
        .filter(Boolean)
        .join(" | ");
      return NextResponse.json({ ok: false, error: message || "Không tạo được booking request" }, { status: 400 });
    }

    const whenText = requestedStartAt
      ? new Date(requestedStartAt).toLocaleString("vi-VN", {
          timeZone: "Asia/Ho_Chi_Minh",
          hour12: false,
        })
      : "-";

    const notifyText = [
      "<b>📥 Có booking mới từ landing page</b>",
      `• Khách: <b>${customerName ?? "-"}</b>`,
      `• SĐT: <b>${customerPhone ?? "-"}</b>`,
      `• Dịch vụ: ${requestedService || "-"}`,
      `• Thợ mong muốn: ${preferredStaff || "-"}`,
      `• Giờ yêu cầu: ${whenText}`,
      note ? `• Ghi chú: ${note}` : null,
      `• Quản trị: ${publicBaseUrl}/manage/booking-requests`,
    ].filter(Boolean).join("\n");

    await notifyTelegram(notifyText);

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}
