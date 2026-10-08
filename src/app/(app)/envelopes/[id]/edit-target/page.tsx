import { notFound } from "next/navigation";
import { PageHead } from "@/components/alchemy/PageHead";
import { EditTargetForm } from "./EditTargetForm";
import { liveEnvelopesFromDb } from "@/lib/mock";
import { requireUser } from "@/server/auth/user";

export const dynamic = "force-dynamic";

/**
 * /envelopes/[id]/edit-target — Cluster 1.10.
 *
 * Focused quick edit: just the target. The user lands here from
 * the "Edit target" button on /envelopes/[id]. If they want to
 * rename the envelope or change its planet, they go to
 * /envelopes/[id]/edit (the full form).
 */
export default async function EditTargetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  // DB-backed — see the note in ../edit/page.tsx. This page prefills from
  // memory while `updateEnvelopeTarget` writes through Prisma, so a
  // durably-created vessel was invisible here.
  const ENVELOPES = await liveEnvelopesFromDb(user.id);
  const env = ENVELOPES.find((e) => e.id === id);
  if (!env) notFound();

  return (
    <div>
      <PageHead
        eyebrow={`Money · Envelopes · ${env.name} · Edit target`}
        title={`Adjust ${env.name}`}
        em="change the target, keep everything else."
        accent="jupiter"
        explanation={
          <>
            Just the target — the vessel's name and planet stay the same. The current balance is preserved, so the bar updates to reflect the new target the next render.
          </>
        }
      />

      <EditTargetForm
        envelope={{
          id: env.id,
          name: env.name,
          targetCents: env.target,
          currentCents: env.current,
        }}
      />
    </div>
  );
}
