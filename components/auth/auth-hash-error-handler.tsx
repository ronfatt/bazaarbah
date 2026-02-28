"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function AuthHashErrorHandler() {
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
    if (!hash) return;

    const hashParams = new URLSearchParams(hash);
    const errorCode = hashParams.get("error_code");
    const error = hashParams.get("error");

    if (!errorCode && !error) return;

    const targetError = errorCode === "otp_expired" ? "reset_link_expired" : "reset_link_invalid";
    router.replace(`/auth?error=${targetError}`);
  }, [router]);

  return null;
}
