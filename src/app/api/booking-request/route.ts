import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function getSupabase() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Thiếu cấu hình Supabase env.");
  }
  return createClient(supabaseUrl, supabaseAnonKey);
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

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}
