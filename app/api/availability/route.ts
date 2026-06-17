import { NextResponse } from "next/server";
import { redis, TRIP_KEY } from "@/lib/redis";
import type { Participant } from "@/lib/types";

export const dynamic = "force-dynamic";

async function readAll(): Promise<Participant[]> {
  if (!redis) return [];
  const map = await redis.hgetall<Record<string, Participant>>(TRIP_KEY);
  return map ? Object.values(map) : [];
}

export async function GET() {
  if (!redis) {
    return NextResponse.json({ configured: false, participants: [] });
  }
  try {
    const participants = await readAll();
    return NextResponse.json({ configured: true, participants });
  } catch {
    return NextResponse.json(
      { configured: false, participants: [], error: "Could not reach storage." },
      { status: 502 },
    );
  }
}

export async function POST(req: Request) {
  if (!redis) {
    return NextResponse.json(
      { configured: false, participants: [], error: "Storage isn't connected yet." },
      { status: 503 },
    );
  }

  const body = (await req.json().catch(() => null)) as Partial<Participant> | null;
  if (!body?.id || !body?.name?.trim()) {
    return NextResponse.json(
      { configured: true, participants: await readAll(), error: "Add your name first." },
      { status: 400 },
    );
  }

  const record: Participant = {
    id: String(body.id).slice(0, 64),
    name: String(body.name).trim().slice(0, 40),
    dates: Array.isArray(body.dates)
      ? Array.from(new Set(body.dates.filter((d) => typeof d === "string"))).slice(0, 400)
      : [],
  };

  try {
    // Each person is a separate hash field, so simultaneous saves never clobber.
    await redis.hset(TRIP_KEY, { [record.id]: record });
    return NextResponse.json({ configured: true, participants: await readAll() });
  } catch {
    return NextResponse.json(
      { configured: true, participants: [], error: "Couldn't save — try again." },
      { status: 502 },
    );
  }
}
