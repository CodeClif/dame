// dame-notify: sends a "your turn" web push to the other player of a play-over-days game.
// Called by the game right after a move: POST { id, token }. The token proves the caller
// holds a seat; we only notify when it is now the *other* seat's turn.
//
// Secrets (Project Settings → Edge Functions → Secrets):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (e.g. "https://codeclif.github.io/dame/")
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase inside functions;
// the service key never leaves the server.
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

async function sha256Hex(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  let body: { id?: string; token?: string };
  try { body = await req.json(); } catch { return json({ error: "bad json" }, 400); }
  const { id, token } = body;
  if (!id || !/^[A-HJKMNP-Z2-9]{8}$/.test(id) || !token || token.length < 16 || token.length > 64) return json({ error: "bad input" }, 400);

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: g } = await db.from("dame_days_games")
    .select("id, host_secret, guest_secret, host_nick, guest_nick, first_turn, moves, result")
    .eq("id", id).maybeSingle();
  if (!g) return json({ sent: false, why: "no game" }, 404);
  const hash = await sha256Hex(token);
  const seat = hash === g.host_secret ? "h" : hash === g.guest_secret ? "g" : null;
  if (!seat) return json({ error: "not a player" }, 403);

  const plies = (g.moves || []).length;
  const turnSide = plies % 2 === 0 ? g.first_turn : -g.first_turn;
  const toMove = turnSide === 1 ? "h" : "g";
  if (toMove === seat && !g.result) return json({ sent: false, why: "still your turn" });
  const other = seat === "h" ? "g" : "h";
  const { data: sub } = await db.from("dame_push_subs").select("endpoint, p256dh, auth").eq("game_id", id).eq("seat", other).maybeSingle();
  if (!sub) return json({ sent: false, why: "not subscribed" });

  const mover = seat === "h" ? g.host_nick : g.guest_nick || "Your friend";
  webpush.setVapidDetails(Deno.env.get("VAPID_SUBJECT") || "https://codeclif.github.io/dame/", Deno.env.get("VAPID_PUBLIC_KEY")!, Deno.env.get("VAPID_PRIVATE_KEY")!);
  const payload = JSON.stringify({
    title: g.result ? "Your Dame game has ended" : "Your move in Dame ✏️",
    body: g.result ? `${mover} finished the game. See how it ended.` : `${mover} has played. It’s your turn!`,
    url: `./?days=${id}`,
    tag: `dame-${id}`,
  });
  try {
    await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload, { TTL: 60 * 60 * 24 * 3 });
    return json({ sent: true });
  } catch (e) {
    const code = (e as { statusCode?: number }).statusCode;
    if (code === 404 || code === 410) await db.from("dame_push_subs").delete().eq("game_id", id).eq("seat", other);
    return json({ sent: false, why: `push failed (${code ?? "error"})` }, 502);
  }
});
