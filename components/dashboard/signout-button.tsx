"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function SignoutButton() {
  const [loading, setLoading] = useState(false);

  async function onSignOut() {
    setLoading(true);
    await fetch("/api/auth/signout", { method: "POST" });
    window.location.href = "/auth";
  }

  return (
    <Button variant="outline" onClick={onSignOut} disabled={loading}>
      {loading ? "Signing out..." : "Sign out"}
    </Button>
  );
}
