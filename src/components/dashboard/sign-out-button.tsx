"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className="text-sm text-moss transition-colors hover:text-forest-dark"
    >
      Sign out
    </button>
  );
}
