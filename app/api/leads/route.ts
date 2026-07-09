import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";

const leadSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  phone: z.string().trim().min(7, "A valid phone number is required").max(30),
  email: z
    .union([z.string().trim().email().max(320), z.literal("")])
    .optional()
    .transform((v) => (v ? v : null)),
  address: z.string().trim().min(5, "Property address is required").max(500),
  condition: z
    .enum(["move-in-ready", "needs-some-work", "major-repairs", "not-sure"])
    .default("not-sure"),
  timeline: z
    .enum(["asap", "30-days", "90-days", "exploring"])
    .default("exploring"),
  notes: z
    .string()
    .trim()
    .max(5000)
    .optional()
    .transform((v) => (v ? v : null)),
  utm: z.record(z.string(), z.string()).optional(),
});

export async function POST(req: NextRequest) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = leadSchema.safeParse(json);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      { error: first?.message ?? "Invalid submission" },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("leads")
    .insert({ ...parsed.data, source: "website" })
    .select("id")
    .single();

  if (error) {
    console.error("lead insert failed:", error.message);
    return NextResponse.json(
      { error: "We couldn't save your info. Please call or try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
}
