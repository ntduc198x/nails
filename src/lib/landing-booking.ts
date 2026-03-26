export type PublicBookingInput = {
  customerName: string;
  customerPhone: string;
  requestedService?: string;
  preferredStaff?: string;
  note?: string;
  requestedStartAt: string;
  requestedEndAt?: string;
  source?: string;
};

export async function createPublicBookingRequest(input: PublicBookingInput) {
  const res = await fetch("/api/booking-request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const json = await res.json();

  if (!res.ok || !json?.ok) {
    throw new Error(json?.error || "Không tạo được booking request");
  }

  return json.data;
}
