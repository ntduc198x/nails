"use client";

import { getCurrentSessionRole } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ManageEntryPage() {
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    async function run() {
      const role = await getCurrentSessionRole();
      if (!mounted) return;

      if (role === "ACCOUNTANT") {
        router.replace("/manage/checkout");
        return;
      }

      router.replace("/manage/appointments");
    }

    void run();
    return () => {
      mounted = false;
    };
  }, [router]);

  return <div className="p-6 text-sm text-neutral-500">Đang chuyển trang...</div>;
}
