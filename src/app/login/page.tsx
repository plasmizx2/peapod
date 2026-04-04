import Link from "next/link";
import { FigmaAuthShell } from "@/components/figma/figma-auth-shell";
import { LoginForm } from "./login-form";

function safeCallbackUrl(raw: string | string[] | undefined): string {
  if (typeof raw !== "string" || raw.length === 0) {
    return "/dashboard";
  }
  if (!raw.startsWith("/") || raw.startsWith("//")) {
    return "/dashboard";
  }
  return raw;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
}) {
  const sp = await searchParams;
  const callbackUrl = safeCallbackUrl(sp.callbackUrl);

  const showGoogle =
    Boolean(process.env.AUTH_GOOGLE_ID) &&
    Boolean(process.env.AUTH_GOOGLE_SECRET);
  const showGithub =
    Boolean(process.env.AUTH_GITHUB_ID) &&
    Boolean(process.env.AUTH_GITHUB_SECRET);

  return (
    <FigmaAuthShell
      variant="signin"
      footer={
        <p className="mt-8 text-center text-sm">
          <span className="text-slate-light">Need an account? </span>
          <Link
            href="/signup"
            className="font-medium text-cyan-bright transition-colors hover:text-cyan"
          >
            Sign up
          </Link>
        </p>
      }
    >
      <LoginForm
        callbackUrl={callbackUrl}
        showGoogle={showGoogle}
        showGithub={showGithub}
      />
    </FigmaAuthShell>
  );
}
