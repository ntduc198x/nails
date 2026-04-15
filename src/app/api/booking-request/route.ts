import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { rebalanceOpenBookingRequests } from "@/lib/booking-capacity";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabase() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Thiếu cấu hình Supabase env.");
  }
  return createClient(supabaseUrl, supabaseAnonKey);
}

function getServiceSupabase() {
  if (!supabaseUrl || !supabaseServiceRoleKey) return null;
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
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

    const createdBookingId = typeof data === "string"
      ? data
      : typeof data === "object" && data
        ? String((data as { booking_request_id?: string; id?: string }).booking_request_id ?? (data as { id?: string }).id ?? "")
        : "";

    if (createdBookingId) {
      const serviceClient = getServiceSupabase();
      if (serviceClient) {
        const { data: createdRow } = await serviceClient
          .from("booking_requests")
          .select("id,org_id,status")
          .eq("id", createdBookingId)
          .maybeSingle();

        if (createdRow?.org_id) {
          await rebalanceOpenBookingRequests({ client: serviceClient, orgId: createdRow.org_id });
          const { data: refreshedRow } = await serviceClient
            .from("booking_requests")
            .select("id,status")
            .eq("id", createdBookingId)
            .maybeSingle();

          return NextResponse.json({ ok: true, data, bookingRequest: refreshedRow ?? createdRow });
        }
      }
    }

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}
