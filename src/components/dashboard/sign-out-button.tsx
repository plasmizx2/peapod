"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className="text-sm text-zinc-500 hover:text-zinc-300"
    >
      Sign out
    </button>
  );
}
