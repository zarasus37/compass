import * as React from "react";
import { notFound } from "next/navigation";
import { PageHead } from "@/components/alchemy/PageHead";
import { EditEnvelopeForm } from "./EditEnvelopeForm";
import { liveEnvelopes } from "@/lib/mock";

export const dynamic = "force-dynamic";

/**
 * /envelopes/[id]/edit — Cluster 1.10.
 *
 * Edit an existing envelope's name and target. The form is
 * pre-filled with the current values. Same pattern as the new
 * transaction form (dollars in, server converts to cents).
 */
export default function EditEnvelopePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
  const ENVELOPES = liveEnvelopes();
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
