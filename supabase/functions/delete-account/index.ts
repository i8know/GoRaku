// Supabase Edge Function: Menghapus akun pengguna yang sedang terautentikasi.
// Menggunakan JWT pemanggil (auth.getUser()) untuk memverifikasi identitas,
// lalu memakai SUPABASE_SERVICE_ROLE_KEY hanya di lingkungan server Edge Function
// untuk menghapus user terkait di `auth.users` (data public.* terhapus lewat ON DELETE CASCADE).

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const BASE_CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  Vary: "Origin",
};

function parseAllowedOrigins(): string[] {
  const raw = Deno.env.get("ALLOWED_ORIGINS") ?? "";
  return raw
    .split(",")
    .map((o) => o.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}

function resolveCors(req: Request): {
  allowed: boolean;
  headers: Record<string, string>;
} {
  const reqOrigin = (req.headers.get("Origin") ?? "").trim().replace(/\/+$/, "");
  const allowlist = parseAllowedOrigins();

  if (allowlist.length > 0) {
    if (reqOrigin && !allowlist.includes(reqOrigin)) {
      return { allowed: false, headers: { ...BASE_CORS_HEADERS } };
    }
    return {
      allowed: true,
      headers: {
        ...BASE_CORS_HEADERS,
        ...(reqOrigin ? { "Access-Control-Allow-Origin": reqOrigin } : {}),
      },
    };
  }

  // Jika ALLOWED_ORIGINS belum disetel di secrets Supabase, tetap berfungsi tetapi catat peringatan.
  if (reqOrigin) {
    console.warn(
      "[delete-account] ALLOWED_ORIGINS belum disetel; setel secret ALLOWED_ORIGINS untuk membatasi origin CORS.",
    );
  }
  return {
    allowed: true,
    headers: {
      ...BASE_CORS_HEADERS,
      "Access-Control-Allow-Origin": reqOrigin || "*",
    },
  };
}

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  corsHeaders: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

Deno.serve(async (req: Request) => {
  const cors = resolveCors(req);
  if (!cors.allowed) {
    return jsonResponse({ error: "Origin permintaan tidak diizinkan." }, 403, cors.headers);
  }

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors.headers });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Metode tidak diizinkan." }, 405, cors.headers);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return jsonResponse(
        { error: "Token otorisasi tidak ditemukan." },
        401,
        cors.headers,
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const clientApiKey =
      Deno.env.get("SUPABASE_ANON_KEY") ??
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
      "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !clientApiKey || !serviceRoleKey) {
      return jsonResponse(
        { error: "Konfigurasi layanan belum lengkap." },
        500,
        cors.headers,
      );
    }

    // 1. Verifikasi JWT pemanggil menggunakan konteks user yang masuk
    const supabaseClient = createClient(supabaseUrl, clientApiKey, {
      global: {
        headers: { Authorization: authHeader },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return jsonResponse(
        { error: "Sesi tidak valid atau telah kedaluwarsa." },
        401,
        cors.headers,
      );
    }

    // 2. Hapus hanya pengguna yang terverifikasi memakai hak admin di lingkungan server
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
      user.id,
    );

    if (deleteError) {
      console.error("[delete-account] deleteUser failed:", deleteError.status ?? "unknown");
      return jsonResponse(
        { error: "Gagal menghapus akun pengguna. Silakan coba lagi." },
        400,
        cors.headers,
      );
    }

    return jsonResponse(
      { deleted: true, userId: user.id },
      200,
      cors.headers,
    );
  } catch (err) {
    console.error(
      "[delete-account] unexpected error:",
      err instanceof Error ? err.name : "unknown",
    );
    return jsonResponse({ error: "Terjadi galat internal server." }, 500, cors.headers);
  }
});
