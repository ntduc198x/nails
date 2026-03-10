"use client";

import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return setMsg("Thiếu cấu hình Supabase env.");

    try {
      setLoading(true);
      setMsg(null);

      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMsg("Đăng ký thành công. Nếu Supabase bật email confirm, hãy xác nhận email trước khi login.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace("/");
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Auth failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-100 p-4">
      <form onSubmit={onSubmit} className="w-full max-w-md space-y-3 card">
        <h1 className="text-2xl font-bold">Nails App Login</h1>
        <p className="text-sm text-neutral-500">Đăng nhập để dùng app. Tài khoản đầu tiên là OWNER, các tài khoản sau mặc định RECEPTION.</p>

        <div className="flex gap-2 rounded-lg bg-neutral-100 p-1 text-sm">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`flex-1 rounded-md px-3 py-2 ${mode === "login" ? "bg-white" : ""}`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`flex-1 rounded-md px-3 py-2 ${mode === "signup" ? "bg-white" : ""}`}
          >
            Sign up
          </button>
        </div>

        <input
          className="w-full input"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="w-full input"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button
          disabled={loading}
          className="w-full btn btn-primary disabled:opacity-50"
        >
          {loading ? "Đang xử lý..." : mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}
        </button>

        {msg && <p className="text-sm text-neutral-700">{msg}</p>}
      </form>
    </main>
  );
}
