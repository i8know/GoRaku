// Supabase Edge Function: Menghapus akun pengguna yang sedang terautentikasi.
// Menggunakan JWT pemanggil (auth.getUser()) untuk memverifikasi identitas,
// lalu memakai SUPABASE_SERVICE_ROLE_KEY hanya di lingkungan server Edge Function
// untuk menghapus user terkait di `auth.users` (data public.* terhapus lewat ON DELETE CASCADE).

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Metode tidak diizinkan." }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return jsonResponse(
        { error: "Token otorisasi tidak ditemukan." },
        401,
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
        { error: "Konfigurasi environment Edge Function belum lengkap." },
        500,
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
      return jsonResponse(
        { error: deleteError.message || "Gagal menghapus akun pengguna." },
        400,
      );
    }

    return jsonResponse(
      { deleted: true, userId: user.id },
      200,
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Terjadi galat internal server.";
    return jsonResponse({ error: message }, 500);
  }
});
