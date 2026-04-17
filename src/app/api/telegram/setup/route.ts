import { NextResponse } from "next/server";

const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
const publicBaseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.chambeauty.io.vn";

const BOT_COMMANDS = [
  { command: "start", description: "Bat dau su dung bot" },
  { command: "link", description: "Lien ket tai khoan Nails App" },
  { command: "lich", description: "Xem lich hom nay" },
  { command: "doanhthu", description: "Doanh thu hom nay" },
  { command: "ca", description: "Ca lam dang mo" },
  { command: "booking", description: "Booking cho xu ly" },
];

export async function POST() {
  if (!telegramBotToken) {
    return NextResponse.json(
      { ok: false, error: "TELEGRAM_BOT_TOKEN is not configured" },
      { status: 500 }
    );
  }

  const webhookUrl = `${publicBaseUrl}/api/telegram/callback`;
  const results: Record<string, unknown> = {};
  const errors: string[] = [];

  // Set webhook
  try {
    const webhookRes = await fetch(
      `https://api.telegram.org/bot${telegramBotToken}/setWebhook`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: webhookUrl,
          allowed_updates: ["message", "callback_query"],
        }),
      }
    );
    const webhookData = await webhookRes.json();
    results.webhook = webhookData;
    if (!webhookData.ok) {
      errors.push(`Webhook error: ${JSON.stringify(webhookData)}`);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    results.webhook = { error: msg };
    errors.push(`Webhook exception: ${msg}`);
  }

  // Set commands
  try {
    const commandsRes = await fetch(
      `https://api.telegram.org/bot${telegramBotToken}/setMyCommands`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commands: BOT_COMMANDS }),
      }
    );
    const commandsData = await commandsRes.json();
    results.commands = commandsData;
    if (!commandsData.ok) {
      errors.push(`Commands error: ${JSON.stringify(commandsData)}`);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    results.commands = { error: msg };
    errors.push(`Commands exception: ${msg}`);
  }

  return NextResponse.json({
    ok: errors.length === 0,
    webhookUrl,
    publicBaseUrl,
    results,
    errors: errors.length > 0 ? errors : undefined,
  });
}

export async function GET() {
  if (!telegramBotToken) {
    return NextResponse.json(
      { ok: false, error: "TELEGRAM_BOT_TOKEN is not configured" },
      { status: 500 }
    );
  }

  try {
    const [webhookRes, commandsRes, meRes] = await Promise.all([
      fetch(`https://api.telegram.org/bot${telegramBotToken}/getWebhookInfo`),
      fetch(`https://api.telegram.org/bot${telegramBotToken}/getMyCommands`),
      fetch(`https://api.telegram.org/bot${telegramBotToken}/getMe`),
    ]);

    const webhook = await webhookRes.json();
    const commands = await commandsRes.json();
    const me = await meRes.json();

    return NextResponse.json({
      ok: true,
      webhook,
      commands,
      bot: me,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
