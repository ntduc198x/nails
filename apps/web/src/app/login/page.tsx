"use client";

import { AuthPanel } from "@/components/landing/auth-panel";
import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="landing-auth-page landing-auth-page--login">
      <div className="landing-auth-page__shell">
        <div className="landing-auth-page__container landing-auth-page__container--narrow landing-account-page">
          <div className="landing-account-page__topbar">
            <Link className="landing-account-page__back" href="/">
              Trang chủ
            </Link>
          </div>
          <div className="landing-auth-page__panel">
            <AuthPanel variant="page" />
          </div>
        </div>
      </div>
    </main>
  );
}
