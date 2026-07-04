import { requireSession } from "@/lib/server/auth";
import { handle } from "@/lib/server/api";

export const runtime = "nodejs";

export async function GET() {
  return handle(async () => {
    const id = await requireSession();
    return { id };
  });
}
