import { NextResponse } from "next/server";
import { getBookingWindowCapacitySnapshot, rebalanceOpenBookingRequests } from "@/lib/booking-capacity";
import { verifyTelegramWebhookRequest } from "@/lib/route-secrets";
import {
  getAdminSupabase,
  getTelegramUserRole,
  isManagerOrOwner,
  answerCallbackQuery as sharedAnswerCallback,
  deleteTelegramMessage,
  sendTelegramMessage,
  handleStartCommand,
  handleLinkCommand,
  handleLichCommand,
  handleDoanhthuCommand,
  handleCaCommand,
  handleBookingCommand,
  handleManageCommand,
  handleCrmMenu,
  handleMeCommand,
  handleOverviewCommand,
  handleRevenueReportCommand,
  handleCrmFollowUpCommand,
  handleCrmAtRiskCommand,
  handleCrmContactedCommand,
  beginCustomReportConversation,
  handleQuickCreateMenu,
  beginQuickCreateAppointmentConversation,
  confirmQuickCreateAppointment,
  handleQuickCreateDateSelection,
  handleQuickCreateServiceSelection,
  cancelTelegramConversation,
  handleQuickCheckinMenu,
  handleQuickCheckinAction,
  handleBookingDetailCommand,
  handleTelegramConversationMessage,
} from "@/lib/telegram-bot";

const publicBaseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://chambeauty.io.vn";
const NEARBY_WARNING_MINUTES = Number(process.env.BOOKING_NEARBY_WARNING_MINUTES ?? "30");

function addMinutes(iso: string, minutes: number) {
  return new Date(new Date(iso).getTime() + minutes * 60 * 1000).toISOString();
}

function formatViDateTime(iso: string) {
  return new Date(iso).toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour12: false,
  });
}

function pickCustomerName(customers: { name?: string } | { name?: string }[] | null | undefined) {
  if (Array.isArray(customers)) return customers[0]?.name ?? "Khach";
  return customers?.name ?? "Khach";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildBookingResultMessage(payload: {
  title: string;
  customerName: string;
  customerPhone?: string | null;
  requestedService?: string | null;
  requestedStartAt: string;
  note?: string | null;
  resultLine: string;
  extraLines?: string[];
}) {
  const lines = [
    "\u{1F514} ===================",
    payload.title,
    "---------------------",
    `\u{1F464} Khach: <b>${escapeHtml(payload.customerName)}</b>`,
    `\u{1F4DE} SDT: <b>${escapeHtml(payload.customerPhone || "-")}</b>`,
    `\u{1F485} DV: ${escapeHtml(payload.requestedService || "-")}`,
    `\u{1F550} Hen: ${formatViDateTime(payload.requestedStartAt)}`,
    `\u{1F4DD} Ghi chu: ${escapeHtml(payload.note || "-")}`,
    "---------------------",
    payload.resultLine,
    ...(payload.extraLines ?? []),
  ];

  return lines.join("\n");
}

async function ensureCustomer(supabase: ReturnType<typeof getAdminSupabase>, booking: {
  org_id: string;
  customer_name: string;
  customer_phone: string;
  requested_service?: string | null;
  preferred_staff?: string | null;
  note?: string | null;
}) {
  const { data: existingCustomer, error: customerError } = await supabase
    .from("customers")
    .select("id,notes")
    .eq("org_id", booking.org_id)
    .eq("name", booking.customer_name)
    .eq("phone", booking.customer_phone)
    .limit(1)
    .maybeSingle();

  if (customerError) throw customerError;

  const mergedNotes = [
    existingCustomer?.notes,
    booking.requested_service ? `DV: ${booking.requested_service}` : null,
    booking.preferred_staff ? `Tho mong muon: ${booking.preferred_staff}` : null,
    booking.note || null,
  ].filter(Boolean).join(" | ");

  if (existingCustomer?.id) {
    const { error: updateCustomerError } = await supabase
      .from("customers")
      .update({ notes: mergedNotes || null })
      .eq("id", existingCustomer.id);

    if (updateCustomerError) throw updateCustomerError;
    return existingCustomer.id;
  }

  const { data: newCustomer, error: newCustomerError } = await supabase
    .from("customers")
    .insert({
      org_id: booking.org_id,
      name: booking.customer_name,
      phone: booking.customer_phone,
      notes: mergedNotes || null,
    })
    .select("id")
    .single();

  if (newCustomerError) throw newCustomerError;
  return newCustomer.id;
}

async function convertBookingToAppointment(supabase: ReturnType<typeof getAdminSupabase>, booking: {
  id: string;
  org_id: string;
  branch_id?: string | null;
  customer_name: string;
  customer_phone: string;
  requested_service?: string | null;
  preferred_staff?: string | null;
  note?: string | null;
  requested_start_at: string;
  requested_end_at: string;
}) {
  const customerId = await ensureCustomer(supabase, booking);

  const { data: profileRow, error: profileError } = await supabase
    .from("profiles")
    .select("default_branch_id")
    .eq("org_id", booking.org_id)
    .not("default_branch_id", "is", null)
    .limit(1)
    .maybeSingle();

  if (profileError) throw profileError;

  const { data: appointment, error: appointmentError } = await supabase
    .from("appointments")
    .insert({
      org_id: booking.org_id,
      branch_id: booking.branch_id ?? profileRow?.default_branch_id ?? null,
      customer_id: customerId,
      staff_user_id: null,
      resource_id: null,
      start_at: booking.requested_start_at,
      end_at: booking.requested_end_at,
      status: "BOOKED",
    })
    .select("id")
    .single();

  if (appointmentError) throw appointmentError;

  const { error: updateBookingError } = await supabase
    .from("booking_requests")
    .update({
      status: "CONVERTED",
      appointment_id: appointment.id,
    })
    .eq("id", booking.id);

  if (updateBookingError) throw updateBookingError;

  await rebalanceOpenBookingRequests({ client: supabase, orgId: booking.org_id });

  return appointment.id;
}

async function handleMenuCallback(callback: { id: string; data?: string; message?: { from?: { id: number } } }, action: string, chatId: string) {
  const telegramUserId = callback.message?.from?.id;
  if (!telegramUserId) {
    await sharedAnswerCallback(callback.id, "KhÃƒÂ´ng xÃƒÂ¡c Ã„â€˜Ã¡Â»â€¹nh Ã„â€˜Ã†Â°Ã¡Â»Â£c ngÃ†Â°Ã¡Â»Âi dÃƒÂ¹ng.");
    return NextResponse.json({ ok: false, error: "no_user_id" });
  }

  const userInfo = await getTelegramUserRole(telegramUserId);

  if (!userInfo.linked) {
    await sharedAnswerCallback(callback.id, "BÃ¡ÂºÂ¡n chÃ†Â°a liÃƒÂªn kÃ¡ÂºÂ¿t tÃƒÂ i khoÃ¡ÂºÂ£n. DÃƒÂ¹ng /start Ã„â€˜Ã¡Â»Æ’ bÃ¡ÂºÂ¯t Ã„â€˜Ã¡ÂºÂ§u.");
    return NextResponse.json({ ok: true, reason: "not_linked" });
  }

  if (!isManagerOrOwner(userInfo.role)) {
    await sharedAnswerCallback(callback.id, "ChÃ¡Â»â€° OWNER hoÃ¡ÂºÂ·c MANAGER mÃ¡Â»â€ºi Ã„â€˜Ã†Â°Ã¡Â»Â£c sÃ¡Â»Â­ dÃ¡Â»Â¥ng chÃ¡Â»Â©c nÃ„Æ’ng nÃƒÂ y.");
    return NextResponse.json({ ok: true, reason: "forbidden" });
  }

  const orgId = userInfo.org_id!;

  switch (action) {
    case "admin":
      await handleManageCommand(chatId);
      await sharedAnswerCallback(callback.id, "Ã„ÂÃƒÂ£ mÃ¡Â»Å¸ menu quÃ¡ÂºÂ£n trÃ¡Â»â€¹");
      break;
    case "overview":
      await handleOverviewCommand(orgId, chatId);
      await sharedAnswerCallback(callback.id, "Ã„ÂÃƒÂ£ cÃ¡ÂºÂ­p nhÃ¡ÂºÂ­t tÃ¡Â»â€¢ng quan");
      break;
    case "report":
      await sendTelegramMessage(chatId, "Ã°Å¸â€œË† <b>BÃƒÂO CÃƒÂO DOANH THU</b>\n\nChÃ¡Â»Ân khoÃ¡ÂºÂ£ng thÃ¡Â»Âi gian:", {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "Ã°Å¸â€œâ€¦ HÃƒÂ´m nay", callback_data: "report:today" },
              { text: "Ã°Å¸â€œâ€  TuÃ¡ÂºÂ§n nÃƒÂ y", callback_data: "report:week" },
            ],
            [
              { text: "Ã°Å¸â€”â€œÃ¯Â¸Â ThÃƒÂ¡ng nÃƒÂ y", callback_data: "report:month" },
              { text: "Ã°Å¸â€œÅ  TÃƒÂ¹y chÃ¡Â»Ân", callback_data: "report:custom" },
            ],
            [{ text: "Ã¢â€”â‚¬Ã¯Â¸Â Quay lÃ¡ÂºÂ¡i", callback_data: "menu:admin" }],
          ],
        },
      });
      await sharedAnswerCallback(callback.id, "Ã„ÂÃƒÂ£ mÃ¡Â»Å¸ menu bÃƒÂ¡o cÃƒÂ¡o");
      break;
    case "crm":
      await handleCrmMenu(chatId);
      await sharedAnswerCallback(callback.id, "Ã„ÂÃƒÂ£ mÃ¡Â»Å¸ CRM");
      break;
    case "quickcreate":
      await handleQuickCreateMenu(chatId);
      await sharedAnswerCallback(callback.id, "Ã„ÂÃƒÂ£ mÃ¡Â»Å¸ tÃ¡ÂºÂ¡o nhanh");
      break;
    case "lich":
      await handleLichCommand(orgId, chatId);
      await sharedAnswerCallback(callback.id, "Ã„ÂÃƒÂ£ cÃ¡ÂºÂ­p nhÃ¡ÂºÂ­t lÃ¡Â»â€¹ch hÃƒÂ´m nay");
      break;
    case "doanhthu":
      await handleDoanhthuCommand(orgId, chatId);
      await sharedAnswerCallback(callback.id, "Ã„ÂÃƒÂ£ cÃ¡ÂºÂ­p nhÃ¡ÂºÂ­t doanh thu");
      break;
    case "ca":
      await handleCaCommand(orgId, chatId);
      await sharedAnswerCallback(callback.id, "Ã„ÂÃƒÂ£ cÃ¡ÂºÂ­p nhÃ¡ÂºÂ­t ca lÃƒÂ m");
      break;
    case "booking":
      await handleBookingCommand(orgId, chatId);
      await sharedAnswerCallback(callback.id, "Ã„ÂÃƒÂ£ cÃ¡ÂºÂ­p nhÃ¡ÂºÂ­t booking");
      break;
    default:
      await sharedAnswerCallback(callback.id, "ChÃ¡Â»Â©c nÃ„Æ’ng khÃƒÂ´ng hÃ¡Â»â€” trÃ¡Â»Â£.");
  }

  return NextResponse.json({ ok: true, action });
}

export async function processTelegramUpdate(body: unknown) {
  try {
    type TelegramUpdatePayload = {
      message?: Parameters<typeof handleMessage>[0];
      callback_query?: Parameters<typeof handleCallback>[0] | null;
    };

    const update =
      typeof body === "object" && body !== null ? (body as TelegramUpdatePayload) : null;

    if (update?.message) {
      return await handleMessage(update.message);
    }

    const callback = update?.callback_query;
    if (!callback?.data) {
      return NextResponse.json({ ok: true, ignored: true, debug: { reason: "unsupported_update" } });
    }

    return await handleCallback(callback);
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Telegram webhook failed" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const auth = verifyTelegramWebhookRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  const body = await req.json();
  return processTelegramUpdate(body);
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "/api/telegram/callback",
    mode: process.env.NODE_ENV,
    note: "GET chi de health-check. Telegram webhook that su dung POST.",
    local_test: {
      message: {
        method: "POST",
        sample: {
          message: {
            from: { id: 123456789, username: "local_test", first_name: "Local" },
            chat: { id: 123456789 },
            text: "/start",
          },
        },
      },
      callback_query: {
        method: "POST",
        sample: {
          callback_query: {
            id: "local-callback-1",
            data: "menu:admin",
            message: {
              chat: { id: 123456789 },
              message_id: 1,
              from: { id: 123456789 },
            },
          },
        },
      },
    },
  });
}

async function handleMessage(message: { from?: { id: number; username?: string; first_name?: string }; chat?: { id: number | string }; text?: string }) {
  const chatId = message.chat?.id ? String(message.chat.id) : null;
  if (!chatId) return NextResponse.json({ ok: true, ignored: true });

  const text = (message.text ?? "").trim();
  const from = message.from;
  if (!from?.id) return NextResponse.json({ ok: true, ignored: true });

  const telegramUserId = from.id;
  const telegramUsername = from.username;
  const telegramFirstName = from.first_name;

  const consumedByConversation = await handleTelegramConversationMessage(telegramUserId, chatId, text);
  if (consumedByConversation) {
    return NextResponse.json({ ok: true, handled: "conversation" });
  }

  const parts = text.split(/\s+/);
  const command = parts[0]?.toLowerCase() ?? "";
  const args = parts.slice(1);

  if (command === "/start") {
    await handleStartCommand(telegramUserId, chatId);
    return NextResponse.json({ ok: true, command: "start" });
  }

  if (command === "/link") {
    const code = args[0]?.trim();
    if (!code) {
      await sendTelegramMessage(chatId, "Ã¢Ââ€” CÃƒÂº phÃƒÂ¡p: <code>/link MÃƒÆ’_6_SÃ¡Â»Â</code>\n\nLÃ¡ÂºÂ¥y mÃƒÂ£ trong Nails App Ã¢â€ â€™ HÃ¡Â»â€œ sÃ†Â¡ & bÃ¡ÂºÂ£o mÃ¡ÂºÂ­t Ã¢â€ â€™ LiÃƒÂªn kÃ¡ÂºÂ¿t Telegram");
      return NextResponse.json({ ok: true, command: "link", error: "missing_code" });
    }
    await handleLinkCommand(telegramUserId, telegramUsername, telegramFirstName, code, chatId);
    return NextResponse.json({ ok: true, command: "link" });
  }

  if (["/manage", "/me", "/crm", "/lich", "/doanhthu", "/ca", "/booking"].includes(command)) {
    const userInfo = await getTelegramUserRole(telegramUserId);

    if (!userInfo.linked) {
      await sendTelegramMessage(chatId, "Ã¢ÂÅ’ BÃ¡ÂºÂ¡n chÃ†Â°a liÃƒÂªn kÃ¡ÂºÂ¿t tÃƒÂ i khoÃ¡ÂºÂ£n.\n\nDÃƒÂ¹ng /start Ã„â€˜Ã¡Â»Æ’ bÃ¡ÂºÂ¯t Ã„â€˜Ã¡ÂºÂ§u.");
      return NextResponse.json({ ok: true, command, error: "not_linked" });
    }

    if (command !== "/me" && !isManagerOrOwner(userInfo.role)) {
      await sendTelegramMessage(chatId, "Ã¢ÂÅ’ ChÃ¡Â»â€° OWNER hoÃ¡ÂºÂ·c MANAGER mÃ¡Â»â€ºi Ã„â€˜Ã†Â°Ã¡Â»Â£c dÃƒÂ¹ng lÃ¡Â»â€¡nh nÃƒÂ y.");
      return NextResponse.json({ ok: true, command, error: "forbidden", role: userInfo.role });
    }

    const orgId = userInfo.org_id!;

    switch (command) {
      case "/manage":
        await handleManageCommand(chatId);
        break;
      case "/crm":
        await handleCrmMenu(chatId);
        break;
      case "/me":
        await handleMeCommand(telegramUserId, chatId);
        break;
      case "/lich":
        await handleLichCommand(orgId, chatId);
        break;
      case "/doanhthu":
        await handleDoanhthuCommand(orgId, chatId);
        break;
      case "/ca":
        await handleCaCommand(orgId, chatId);
        break;
      case "/booking":
        await handleBookingCommand(orgId, chatId);
        break;
    }

    return NextResponse.json({ ok: true, command });
  }

  return NextResponse.json({ ok: true, ignored: true, text: text.slice(0, 50) });
}

async function handleCallback(callback: { id: string; data?: string; message?: { chat?: { id?: number | string }; message_id?: number; from?: { id: number } } }) {
  try {
    const chatId = callback.message?.chat?.id ? String(callback.message.chat.id) : null;
    const messageId = callback.message?.message_id;
    const telegramUserId = callback.message?.from?.id;

    const parts = String(callback.data).split(":");
    const [prefix, action, ...rest] = parts;
    const bookingId = rest.join(":");

    if (prefix === "menu") {
      return await handleMenuCallback(callback, action!, chatId!);
    }

    if (prefix === "report") {
      if (!telegramUserId || !chatId || !action) {
        return NextResponse.json({ ok: true, ignored: true, debug: { callbackData: callback.data, parsed: parts } });
      }

      const userInfo = await getTelegramUserRole(telegramUserId);
      if (!userInfo.linked || !isManagerOrOwner(userInfo.role) || !userInfo.org_id) {
        await sharedAnswerCallback(callback.id, "BÃ¡ÂºÂ¡n khÃƒÂ´ng cÃƒÂ³ quyÃ¡Â»Ân sÃ¡Â»Â­ dÃ¡Â»Â¥ng chÃ¡Â»Â©c nÃ„Æ’ng nÃƒÂ y.");
        return NextResponse.json({ ok: true, reason: "forbidden_report" });
      }

      if (action === "custom") {
        await beginCustomReportConversation(telegramUserId, userInfo.org_id, chatId);
        await sharedAnswerCallback(callback.id, "NhÃ¡ÂºÂ­p khoÃ¡ÂºÂ£ng ngÃƒÂ y Ã„â€˜Ã¡Â»Æ’ xem bÃƒÂ¡o cÃƒÂ¡o");
        return NextResponse.json({ ok: true, action: "report_custom" });
      }

      if (action === "today" || action === "week" || action === "month") {
        await handleRevenueReportCommand(userInfo.org_id, chatId, action);
        await sharedAnswerCallback(callback.id, "Ã„ÂÃƒÂ£ cÃ¡ÂºÂ­p nhÃ¡ÂºÂ­t bÃƒÂ¡o cÃƒÂ¡o");
        return NextResponse.json({ ok: true, action: `report_${action}` });
      }

      return NextResponse.json({ ok: true, ignored: true, debug: { callbackData: callback.data, parsed: parts } });
    }

    if (prefix === "crm") {
      if (!telegramUserId || !chatId || !action) {
        return NextResponse.json({ ok: true, ignored: true, debug: { callbackData: callback.data, parsed: parts } });
      }

      const userInfo = await getTelegramUserRole(telegramUserId);
      if (!userInfo.linked || !isManagerOrOwner(userInfo.role) || !userInfo.org_id) {
        await sharedAnswerCallback(callback.id, "BÃ¡ÂºÂ¡n khÃƒÂ´ng cÃƒÂ³ quyÃ¡Â»Ân sÃ¡Â»Â­ dÃ¡Â»Â¥ng chÃ¡Â»Â©c nÃ„Æ’ng nÃƒÂ y.");
        return NextResponse.json({ ok: true, reason: "forbidden_crm" });
      }

      if (action === "followups") {
        await handleCrmFollowUpCommand(userInfo.org_id, chatId);
        await sharedAnswerCallback(callback.id, "Ã„ÂÃƒÂ£ mÃ¡Â»Å¸ danh sÃƒÂ¡ch follow-up");
        return NextResponse.json({ ok: true, action: "crm_followups" });
      }

      if (action === "at_risk") {
        await handleCrmAtRiskCommand(userInfo.org_id, chatId);
        await sharedAnswerCallback(callback.id, "Ã„ÂÃƒÂ£ mÃ¡Â»Å¸ nhÃƒÂ³m khÃƒÂ¡ch cÃ¡ÂºÂ§n chÄƒm sÃƒÂ³c");
        return NextResponse.json({ ok: true, action: "crm_at_risk" });
      }

      if (action === "contacted") {
        const customerId = rest.join(":");
        const result = await handleCrmContactedCommand(userInfo.org_id, chatId, customerId);
        await sharedAnswerCallback(callback.id, result.message);
        return NextResponse.json({ ok: true, action: "crm_contacted", result });
      }

      return NextResponse.json({ ok: true, ignored: true, debug: { callbackData: callback.data, parsed: parts } });
    }

    if (prefix === "quickcreate") {
      if (!telegramUserId || !chatId || !action) {
        return NextResponse.json({ ok: true, ignored: true, debug: { callbackData: callback.data, parsed: parts } });
      }

      const userInfo = await getTelegramUserRole(telegramUserId);
      if (!userInfo.linked || !isManagerOrOwner(userInfo.role) || !userInfo.org_id) {
        await sharedAnswerCallback(callback.id, "BÃ¡ÂºÂ¡n khÃƒÂ´ng cÃƒÂ³ quyÃ¡Â»Ân sÃ¡Â»Â­ dÃ¡Â»Â¥ng chÃ¡Â»Â©c nÃ„Æ’ng nÃƒÂ y.");
        return NextResponse.json({ ok: true, reason: "forbidden_quickcreate" });
      }

      if (action === "new") {
        await beginQuickCreateAppointmentConversation(telegramUserId, userInfo.org_id, chatId);
        await sharedAnswerCallback(callback.id, "NhÃ¡ÂºÂ­p tÃƒÂªn khÃƒÂ¡ch hÃƒÂ ng");
        return NextResponse.json({ ok: true, action: "quickcreate_new" });
      }

      if (action === "checkin") {
        await handleQuickCheckinMenu(userInfo.org_id, chatId);
        await sharedAnswerCallback(callback.id, "Ã„ÂÃƒÂ£ mÃ¡Â»Å¸ check-in nhanh");
        return NextResponse.json({ ok: true, action: "quickcreate_checkin" });
      }

      if (action === "confirm") {
        const result = await confirmQuickCreateAppointment(telegramUserId, chatId);
        await sharedAnswerCallback(callback.id, result.message);
        return NextResponse.json({ ok: true, action: "quickcreate_confirm", result });
      }

      if (action === "date") {
        const dateMode = rest.join(":");
        const result = await handleQuickCreateDateSelection(telegramUserId, chatId, dateMode);
        await sharedAnswerCallback(callback.id, result.message);
        return NextResponse.json({ ok: true, action: "quickcreate_date", result });
      }

      if (action === "service") {
        const serviceIdOrMode = rest.join(":");
        const result = await handleQuickCreateServiceSelection(telegramUserId, chatId, serviceIdOrMode);
        await sharedAnswerCallback(callback.id, result.message);
        return NextResponse.json({ ok: true, action: "quickcreate_service", result });
      }

      if (action === "cancel") {
        await cancelTelegramConversation(telegramUserId);
        await handleQuickCreateMenu(chatId);
        await sharedAnswerCallback(callback.id, "Ã„ÂÃƒÂ£ hÃ¡Â»Â§y tÃ¡ÂºÂ¡o lÃ¡Â»â€¹ch");
        return NextResponse.json({ ok: true, action: "quickcreate_cancel" });
      }

      return NextResponse.json({ ok: true, ignored: true, debug: { callbackData: callback.data, parsed: parts } });
    }

    if (prefix === "checkin") {
      if (!telegramUserId || !chatId || !action) {
        return NextResponse.json({ ok: true, ignored: true, debug: { callbackData: callback.data, parsed: parts } });
      }

      const userInfo = await getTelegramUserRole(telegramUserId);
      if (!userInfo.linked || !isManagerOrOwner(userInfo.role) || !userInfo.org_id) {
        await sharedAnswerCallback(callback.id, "BÃ¡ÂºÂ¡n khÃƒÂ´ng cÃƒÂ³ quyÃ¡Â»Ân sÃ¡Â»Â­ dÃ¡Â»Â¥ng chÃ¡Â»Â©c nÃ„Æ’ng nÃƒÂ y.");
        return NextResponse.json({ ok: true, reason: "forbidden_checkin" });
      }

      const result = await handleQuickCheckinAction(userInfo.org_id, chatId, action);
      await sharedAnswerCallback(callback.id, result.message);
      return NextResponse.json({ ok: true, action: "checkin", result });
    }

    if (prefix !== "booking" || !action || !bookingId) {
      return NextResponse.json({ ok: true, ignored: true, debug: { callbackData: callback.data, parsed: parts } });
    }

    if (action === "view") {
      if (!telegramUserId || !chatId) {
        return NextResponse.json({ ok: true, ignored: true, debug: { callbackData: callback.data, parsed: parts } });
      }

      const userInfo = await getTelegramUserRole(telegramUserId);
      if (!userInfo.linked || !isManagerOrOwner(userInfo.role) || !userInfo.org_id) {
        await sharedAnswerCallback(callback.id, "Ban khong co quyen su dung chuc nang nay.");
        return NextResponse.json({ ok: true, reason: "forbidden_booking_view" });
      }

      await handleBookingDetailCommand(userInfo.org_id, chatId, bookingId);
      await sharedAnswerCallback(callback.id, "Da mo chi tiet booking");
      return NextResponse.json({ ok: true, action: "booking_view", bookingId });
    }


    const nextStatus =
      action === "confirm" ? "CONFIRMED"
      : action === "cancel" ? "CANCELLED"
      : action === "reschedule" ? "NEEDS_RESCHEDULE"
      : null;
    if (!nextStatus) {
      return NextResponse.json({ ok: true, ignored: true, debug: { callbackData: callback.data, parsed: parts } });
    }

    const supabase = getAdminSupabase();

    const { data: row, error: readErr } = await supabase
      .from("booking_requests")
      .select("id,org_id,branch_id,customer_name,customer_phone,requested_service,preferred_staff,note,requested_start_at,requested_end_at,status,telegram_message_id,telegram_chat_id,appointment_id")
      .eq("id", bookingId)
      .maybeSingle();

    if (readErr) throw readErr;
    if (!row?.id) {
      await sharedAnswerCallback(callback.id, "Khong tim thay booking.");
      return NextResponse.json({ ok: true, missing: true, debug: { callbackData: callback.data, parsed: parts, bookingId } });
    }

    const oldMessageId = row.telegram_message_id ? Number(row.telegram_message_id) : messageId ? Number(messageId) : null;

    if (row.status === "CANCELLED") {
      await sharedAnswerCallback(callback.id, "Booking nay da bi huy truoc do.");
      return NextResponse.json({ ok: true, skipped: true, reason: "already_cancelled", debug: { bookingId, status: row.status } });
    }

    if (row.status === "NEEDS_RESCHEDULE" && nextStatus === "NEEDS_RESCHEDULE") {
      await sharedAnswerCallback(callback.id, "Booking nay da o trang thai can doi lich.");
      return NextResponse.json({ ok: true, skipped: true, reason: "already_reschedule", debug: { bookingId, status: row.status } });
    }

    if (row.status === "CONVERTED" && row.appointment_id) {
      await sharedAnswerCallback(callback.id, "Booking nay da duoc tao appointment truoc do.");
      return NextResponse.json({ ok: true, skipped: true, reason: "already_converted", debug: { bookingId, status: row.status, appointmentId: row.appointment_id } });
    }

    if (nextStatus === "CANCELLED") {
      const updateRes = await supabase
        .from("booking_requests")
        .update({ status: "CANCELLED" })
        .eq("id", bookingId)
        .select("id,status")
        .maybeSingle();

      if (updateRes.error) throw updateRes.error;
      await rebalanceOpenBookingRequests({ client: supabase, orgId: row.org_id });

      if (chatId && oldMessageId) await deleteTelegramMessage(chatId, oldMessageId);
      if (chatId) {
        await sendTelegramMessage(chatId, buildBookingResultMessage({
          title: "<b>\u{274C} BOOKING DA HUY</b>",
          customerName: row.customer_name,
          customerPhone: row.customer_phone,
          requestedService: row.requested_service,
          requestedStartAt: row.requested_start_at,
          note: row.note,
          resultLine: "\u{274C} Ket qua: <b>Da huy tu Telegram</b>",
          extraLines: [`\u{1F517} Quan tri: ${publicBaseUrl}/manage/booking-requests`],
        }));
      }

      await sharedAnswerCallback(callback.id, "Da huy booking");
      return NextResponse.json({ ok: true, status: "CANCELLED", debug: { bookingId } });
    }

    if (nextStatus === "NEEDS_RESCHEDULE") {
      const updateRes = await supabase
        .from("booking_requests")
        .update({ status: "NEEDS_RESCHEDULE" })
        .eq("id", bookingId)
        .select("id,status")
        .maybeSingle();

      if (updateRes.error) throw updateRes.error;
      await rebalanceOpenBookingRequests({ client: supabase, orgId: row.org_id });

      if (chatId && oldMessageId) await deleteTelegramMessage(chatId, oldMessageId);
      if (chatId) {
        await sendTelegramMessage(chatId, buildBookingResultMessage({
          title: "<b>\u{1F4C5} BOOKING CAN DOI LICH</b>",
          customerName: row.customer_name,
          customerPhone: row.customer_phone,
          requestedService: row.requested_service,
          requestedStartAt: row.requested_start_at,
          note: row.note,
          resultLine: "\u{1F4C5} Ket qua: <b>Da chuyen sang trang thai can doi lich</b>",
          extraLines: [`\u{1F517} Quan tri: ${publicBaseUrl}/manage/booking-requests`],
        }));
      }

      await sharedAnswerCallback(callback.id, "Da chuyen booking sang can doi lich");
      return NextResponse.json({ ok: true, status: "NEEDS_RESCHEDULE", debug: { bookingId } });
    }

    const requestedEndAt = row.requested_end_at ?? addMinutes(row.requested_start_at, 60);
    await rebalanceOpenBookingRequests({ client: supabase, orgId: row.org_id });
    const snapshot = await getBookingWindowCapacitySnapshot({
      client: supabase,
      orgId: row.org_id,
      startAt: row.requested_start_at,
      endAt: requestedEndAt,
      excludeBookingRequestId: bookingId,
    });
    const appointmentOverlaps = snapshot.overlaps;
    const MAX_SIMULTANEOUS_BOOKINGS = snapshot.maxSimultaneous;
    const overlapCount = snapshot.overlapCount;

    const { data: refreshedBooking, error: refreshedBookingError } = await supabase
      .from("booking_requests")
      .select("status")
      .eq("id", bookingId)
      .maybeSingle();

    if (refreshedBookingError) throw refreshedBookingError;

    if (refreshedBooking?.status === "NEEDS_RESCHEDULE" || !snapshot.allowed) {
      const updateRes = await supabase
        .from("booking_requests")
        .update({ status: "NEEDS_RESCHEDULE" })
        .eq("id", bookingId)
        .select("id,status")
        .maybeSingle();

      if (updateRes.error) throw updateRes.error;

      if (chatId && oldMessageId) await deleteTelegramMessage(chatId, oldMessageId);
      if (chatId) {
        await sendTelegramMessage(chatId, buildBookingResultMessage({
          title: "<b>\u{26A0}\u{FE0F} BOOKING VUOT GIOI HAN KHUNG GIO</b>",
          customerName: row.customer_name,
          customerPhone: row.customer_phone,
          requestedService: row.requested_service,
          requestedStartAt: row.requested_start_at,
          note: row.note,
          resultLine: "\u{1F4C5} Ket qua: <b>Da chuyen sang can doi lich, chua tao appointment</b>",
          extraLines: [
            `\u{26A0}\u{FE0F} Trung/vuot gioi han voi <b>${overlapCount}</b> lich hien co`,
            ...appointmentOverlaps.slice(0, 3).map((item) => `• ${escapeHtml(pickCustomerName(item.customers))} — ${formatViDateTime(item.start_at)}`),
            `\u{2139}\u{FE0F} Canh bao sat lich trong khoang ±${NEARBY_WARNING_MINUTES} phut chi dung de nhac`,
            `\u{1F517} Quan tri: ${publicBaseUrl}/manage/booking-requests`,
          ],
        }));
      }

      await sharedAnswerCallback(callback.id, `Booking vuot gioi han ${MAX_SIMULTANEOUS_BOOKINGS} khach cung gio, can doi lich`);
      return NextResponse.json({ ok: true, status: "LIMIT_EXCEEDED", debug: { bookingId, overlapCount, appointmentOverlaps } });
    }

    const appointmentId = await convertBookingToAppointment(supabase, {
      id: row.id,
      org_id: row.org_id,
      branch_id: row.branch_id,
      customer_name: row.customer_name,
      customer_phone: row.customer_phone,
      requested_service: row.requested_service,
      preferred_staff: row.preferred_staff,
      note: row.note,
      requested_start_at: row.requested_start_at,
      requested_end_at: requestedEndAt,
    });

    if (chatId && oldMessageId) await deleteTelegramMessage(chatId, oldMessageId);
    if (chatId) {
      await sendTelegramMessage(chatId, buildBookingResultMessage({
        title: "<b>\u{2705} BOOKING DA XAC NHAN</b>",
        customerName: row.customer_name,
        customerPhone: row.customer_phone,
        requestedService: row.requested_service,
        requestedStartAt: row.requested_start_at,
        note: row.note,
        resultLine: "\u{2705} Ket qua: <b>Da xac nhan va tao appointment</b>",
        extraLines: [
          `\u{1F194} Appointment: <code>${appointmentId}</code>`,
          `\u{1F4CC} Trang thai moi: <b>BOOKED ONLINE</b>`,
          `\u{2139}\u{FE0F} Gioi han hien tai: toi da <b>${MAX_SIMULTANEOUS_BOOKINGS}</b> khach cung gio, canh bao sat lich ±${NEARBY_WARNING_MINUTES} phut`,
          `\u{1F517} Quan tri: ${publicBaseUrl}/manage/appointments`,
        ],
      }));
    }

    await sharedAnswerCallback(callback.id, "Da xac nhan va tao appointment");

    return NextResponse.json({
      ok: true,
      status: "CONVERTED",
      debug: {
        bookingId,
        appointmentId,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Telegram callback failed" },
      { status: 500 },
    );
  }
}
