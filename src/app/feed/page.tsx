import { ensureOnboardingComplete } from "@/lib/server-auth";
import FeedClient from "./feed-client";

export default async function FeedPage() {
  const user = await ensureOnboardingComplete();

  return <FeedClient user={user} />;
}
