import Link from "next/link";
import { capabilitiesWithDispute, getCapability, getClaim, getSource } from "@/lib/catalog";
import { candidateUrl, challengers, loadQueue } from "@/lib/queue";
import { ContestedBadge, KindBadge, StanceBadge, StrengthBadge } from "@/components/badges";

export const metadata = { title: "Contested" };

export default function ContestedPage() {
  const disputed = capabilitiesWithDispute();
  const incoming = challengers(loadQueue().candidates);
  const claimCount = disputed.reduce((n, d) => n + d.claims.length, 0);

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Contested</h1>
        <p className="max-w-3xl text-sm text-neutral-500">
          Where the evidence disagrees. A claim is contested when it carries sources on both sides,
          with a stated axis of disagreement &mdash; not merely when a topic is unsettled.
        </p>
        <p className="text-xs text-neutral-500">
          {claimCount} contested claim{claimCount === 1 ? "" : "s"} across {disputed.length} capabilit
          {disputed.length === 1 ? "y" : "ies"} · {incoming.length} incoming challenge
          {incoming.length === 1 ? "" : "s"} awaiting review
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="border-b border-neutral-200 pb-1 text-lg font-semibold dark:border-neutral-800">
          Incoming challenges <span className="text-sm font-normal text-neutral-500">{incoming.length}</span>
        </h2>
        <p className="max-w-3xl text-sm text-neutral-500">
          Papers in the review queue whose findings appear to cut against a claim already in the
          catalog. Unreviewed &mdash; a machine judgment, not yet yours.
        </p>
        {incoming.length === 0 ? (
          <p className="text-sm text-neutral-500">Nothing in the queue currently challenges a held claim.</p>
        ) : (
          <ul className="space-y-3">
            {incoming.map(({ candidate, verdict }) => {
              const target = verdict.contradicts_claim_id ? getClaim(verdict.contradicts_claim_id) : undefined;
              const url = candidateUrl(candidate);
              return (
                <li key={`${candidate.openalex_id}-${verdict.capability}`}
                  className="rounded border border-amber-300 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/20">
                  <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
                      challenges a held claim
                    </span>
                    <Link href={`/capabilities/${verdict.capability}`} className="text-neutral-500 hover:underline">
                      {getCapability(verdict.capability)?.label ?? verdict.capability}
                    </Link>
                    <span className="text-neutral-500">{verdict.confidence} confidence</span>
                  </div>
                  {url ? (
                    <a href={url} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline">{candidate.title}</a>
                  ) : <span className="font-medium">{candidate.title}</span>}
                  <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">{verdict.rationale}</p>
                  {verdict.scope_condition && (
                    <p className="mt-1 text-xs text-neutral-500">Scope: {verdict.scope_condition}</p>
                  )}
                  {target && (
                    <p className="mt-2 text-sm">
                      <span className="text-neutral-500">Against: </span>
                      <Link href={`/claims/${target.id}`} className="hover:underline">{target.statement}</Link>
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="border-b border-neutral-200 pb-1 text-lg font-semibold dark:border-neutral-800">
          Contested claims in the catalog <span className="text-sm font-normal text-neutral-500">{claimCount}</span>
        </h2>
        {disputed.length === 0 ? (
          <p className="text-sm text-neutral-500">No claim is currently marked contested.</p>
        ) : (
          disputed.map(({ capability, claims }) => (
            <section key={capability.id} className="space-y-2">
              <h3 className="text-base font-semibold">
                <Link href={`/capabilities/${capability.id}`} className="hover:underline">{capability.label}</Link>
                <span className="ml-2 text-sm font-normal text-neutral-500">{claims.length}</span>
              </h3>
              <ul className="space-y-3">
                {claims.map((claim) => (
                  <li key={claim.id} className="rounded border border-neutral-200 p-3 dark:border-neutral-800">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <KindBadge kind={claim.kind} />
                      <StrengthBadge strength={claim.backing_strength} />
                      <ContestedBadge />
                    </div>
                    <Link href={`/claims/${claim.id}`} className="font-medium hover:underline">{claim.statement}</Link>
                    {claim.disagreement_axis && (
                      <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">
                        <span className="font-medium">Axis of disagreement</span>
                        {claim.disagreement_axis.is_guess && (
                          <span className="ml-1 text-xs text-amber-700 dark:text-amber-400">(a guess, not verified)</span>
                        )}
                        : {claim.disagreement_axis.description}
                      </p>
                    )}
                    <ul className="mt-2 space-y-1 text-sm">
                      {claim.sources.map((s) => (
                        <li key={s.source} className="flex flex-wrap items-center gap-1.5">
                          <StanceBadge stance={s.stance} />
                          <Link href={`/sources/${s.source}`} className="text-neutral-700 hover:underline dark:text-neutral-300">
                            {getSource(s.source)?.title ?? s.source}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </section>
    </div>
  );
}
