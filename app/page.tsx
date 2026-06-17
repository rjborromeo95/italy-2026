import Planner from "@/components/Planner";
import { redis, TRIP_KEY } from "@/lib/redis";
import type { Participant } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Page() {
  let participants: Participant[] = [];
  let configured = false;

  if (redis) {
    configured = true;
    try {
      const map = await redis.hgetall<Record<string, Participant>>(TRIP_KEY);
      participants = map ? Object.values(map) : [];
    } catch {
      configured = false;
    }
  }

  return <Planner initialParticipants={participants} configured={configured} />;
}
