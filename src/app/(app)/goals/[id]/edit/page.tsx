import { notFound } from "next/navigation";
import { PageHead } from "@/components/alchemy/PageHead";
import { EditGoalForm } from "./EditGoalForm";
import { liveGoalsFromDb, liveEnvelopesFromDb } from "@/lib/mock";
import { requireUser } from "@/server/auth/user";

export const dynamic = "force-dynamic";

/**
 * /goals/[id]/edit — Cluster 1.10.
 *
 * Edit an existing goal. The form is pre-filled with the goal's
 * current values, so the user only needs to change what's
 * different. Same form pattern as /goals/new.
 */
export default async function EditGoalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  // DB-backed — the form writes through `updateGoalToDb` (Prisma), so
  // prefilling from process memory meant a durably-created goal 404'd on
  // its own edit page.
  const GOALS = await liveGoalsFromDb(user.id);
  const ENVELOPES = await liveEnvelopesFromDb(user.id);
  const goal = GOALS.find((g) => g.id === id);
  if (!goal) notFound();

  return (
    <div>
      <PageHead
        eyebrow={`Plan · Goals · ${goal.name} · Edit`}
        title={`Edit ${goal.name}`}
        em="change the destination, the pace, or the priority."
        accent="jupiter"
        explanation={
          <>
            Update the goal's target, per-paycheck contribution, target date, or vessel link. The current balance is preserved — you're changing the destination, not the journey so far.
          </>
        }
      />

      <EditGoalForm
        goal={goal}
        envelopes={ENVELOPES.map((e) => ({ id: e.id, name: e.name }))}
      />
    </div>
  );
}
