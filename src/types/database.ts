/**
 * Narrow types for public.profiles — extend with `supabase gen types` when wired to a project.
 */
export type Profile = {
  id: string;
  email: string | null;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};
