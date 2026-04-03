import Link from "next/link";
import { FigmaAuthShell } from "@/components/figma/figma-auth-shell";
import { SignupForm } from "./signup-form";

export default function SignupPage() {
  const showGoogle = Boolean(process.env.AUTH_GOOGLE_ID);
  const showGithub = Boolean(process.env.AUTH_GITHUB_ID);

  return (
    <FigmaAuthShell
      variant="signup"
      footer={
        <p className="mt-8 text-center text-sm">
          <span className="text-slate-light">Already in? </span>
          <Link
            href="/login"
            className="font-medium text-cyan-bright transition-colors hover:text-cyan"
          >
            Sign in
          </Link>
        </p>
      }
    >
      <SignupForm showGoogle={showGoogle} showGithub={showGithub} />
    </FigmaAuthShell>
  );
}
