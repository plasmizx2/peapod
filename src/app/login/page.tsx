import Link from "next/link";
import { FigmaAuthShell } from "@/components/figma/figma-auth-shell";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  const showGoogle = Boolean(process.env.AUTH_GOOGLE_ID);
  const showGithub = Boolean(process.env.AUTH_GITHUB_ID);

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
      <LoginForm showGoogle={showGoogle} showGithub={showGithub} />
    </FigmaAuthShell>
  );
}
