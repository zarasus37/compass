import { notFound } from "next/navigation";
import { PageHead } from "@/components/alchemy/PageHead";
import { EditEnvelopeForm } from "./EditEnvelopeForm";
import { liveEnvelopesFromDb } from "@/lib/mock";
import { requireUser } from "@/server/auth/user";

export const dynamic = "force-dynamic";

/**
 * /envelopes/[id]/edit — Cluster 1.10.
 *
 * Edit an existing envelope's name and target. The form is
 * pre-filled with the current values. Same pattern as the new
 * transaction form (dollars in, server converts to cents).
 */
export default async function EditEnvelopePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  // DB-backed, not `liveEnvelopes`. The form now WRITES through
  // `updateEnvelopeToDb` (Prisma), so reading the page's prefill from
  // process memory meant a vessel created through the (durable) new
  // form 404'd on its own edit page — the list page found it, the edit
  // page did not.
  const ENVELOPES = await liveEnvelopesFromDb(user.id);
  const env = ENVELOPES.find((e) => e.id === id);
  if (!env) notFound();

  return (
    <div>
      <PageHead
        eyebrow={`Money · Envelopes · ${env.name} · Edit`}
        title={`Edit ${env.name}`}
        em="change the vessel's name or target."
        accent="jupiter"
        explanation={
          <>
            Update the envelope's name or its target. The current balance is preserved — you're changing the destination, not what's already in the vessel. The vessel's planet stays the same; create a new envelope if you need to change planets.
          </>
        }
      />

      <EditEnvelopeForm
        envelope={{
          id: env.id,
          name: env.name,
          targetCents: env.target,
        }}
      />
    </div>
  );
}
