import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
const telegramChatId = process.env.TELEGRAM_BOOKING_CHAT_ID;
const publicBaseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://chambeauty.io.vn";

function getSupabase() {
  if (!supabaseUrl || !supabaseAnonKey) throw new Error("Thiếu cấu hình Supabase env.");
  return createClient(supabaseUrl, supabaseAnonKey);
}

async function sendTelegramBookingMessage(payload: {
  bookingId: string;
  customerName: string;
  customerPhone: string;
  requestedService?: string | null;
  preferredStaff?: string | null;
  note?: string | null;
  requestedStartAt: string;
}) {
  if (!telegramBotToken || !telegramChatId) throw new Error("Thiếu TELEGRAM_BOT_TOKEN hoặc TELEGRAM_BOOKING_CHAT_ID");

  const whenText = new Date(payload.requestedStartAt).toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour12: false,
  });

  const text = [
    "<b>📥 Booking mới từ landing page</b>",
    `• Khách: <b>${payload.customerName}</b>`,
    `• SĐT: <b>${payload.customerPhone}</b>`,
    `• Dịch vụ: ${payload.requestedService || "-"}`,
    `• Thợ mong muốn: ${payload.preferredStaff || "-"}`,
    `• Giờ yêu cầu: ${whenText}`,
    payload.note ? `• Ghi chú: ${payload.note}` : null,
    `• Quản trị: ${publicBaseUrl}/manage/booking-requests`,
  ].filter(Boolean).join("\n");

  const res = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: telegramChatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
      reply_markup: {
        inline_keyboard: [
          [
            { text: "✅ Confirm", callback_data: `booking:confirm:${payload.bookingId}` },
            { text: "❌ Cancel", callback_data: `booking:cancel:${payload.bookingId}` },
          ],
        ],
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Telegram sendMessage failed: ${await res.text()}`);
  }

  return res.json() as Promise<{ ok: boolean; result?: { message_id: number; chat: { id: number | string } } }>;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const record = body?.record ?? body;

    if (!record?.id) {
      return NextResponse.json({ ok: false, error: "Missing booking record" }, { status: 400 });
    }

    const supabase = getSupabase();
    const telegram = await sendTelegramBookingMessage({
      bookingId: record.id,
      customerName: record.customer_name,
      customerPhone: record.customer_phone,
      requestedService: record.requested_service,
      preferredStaff: record.preferred_staff,
      note: record.note,
      requestedStartAt: record.requested_start_at,
    });

    const messageId = telegram.result?.message_id ?? null;
    const chatId = telegram.result?.chat?.id != null ? String(telegram.result.chat.id) : telegramChatId ?? null;

    await supabase
      .from("booking_requests")
      .update({
        telegram_message_id: messageId,
        telegram_chat_id: chatId,
        notified_at: new Date().toISOString(),
      })
      .eq("id", record.id);

    return NextResponse.json({ ok: true, messageId, chatId });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Telegram API route failed" },
      { status: 500 },
    );
  }
}
