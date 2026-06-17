import { Redis } from "@upstash/redis";

// The Vercel Marketplace Upstash integration injects UPSTASH_REDIS_REST_*.
// Older Vercel KV stores used KV_REST_API_*. Support both so it "just works"
// however the integration was added.
const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

export const redis = url && token ? new Redis({ url, token }) : null;

// One trip per deploy by default. Set TRIP_KEY to run multiple trips off one app.
export const TRIP_KEY = process.env.TRIP_KEY ?? "quando:trip:default";
