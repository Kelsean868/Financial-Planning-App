import type { DeathNeedsProfile, Gap, Policy } from "./types.ts";
import { ProvenanceBuilder } from "./provenance.ts";
import { GROUP_LIFE_TERMINATION_AGE, inForceCoverAt } from "./policy-ledger.ts";

/**
 * gap = need − (individual cover + group cover available at this age)
 *
 * Group cover halves at 66 and terminates at 70. Most employed clients are
 * underinsured AND about to lose what they have — the engine must surface that
 * rather than quietly counting cover that will vanish.
 */
export function computeGap(needs: DeathNeedsProfile, policies: Policy[], atAge: number): Gap {
  const b = new ProvenanceBuilder();
  // The gap composes the needs engine's result, so it must carry that engine's
  // provenance forward — including the housing-inference caveat. A number the
  // client sees must never be shown without the uncertainty attached to it.
  b.merge(needs.provenance);
  const cover = inForceCoverAt(policies, atAge);

  const groupFaceTotal = policies
    .filter((p) => p.isGroupCover && (p.status === "in-force" || p.status === "paid-up"))
    .reduce((s, p) => s + p.coverAmount, 0);
  const groupCoverExcluded = groupFaceTotal - cover.group;

  if (groupFaceTotal > 0) {
    if (atAge >= GROUP_LIFE_TERMINATION_AGE) {
      b.rule(`group cover of ${groupFaceTotal} has terminated at age ${GROUP_LIFE_TERMINATION_AGE} — excluded in full`);
    } else if (groupCoverExcluded > 0) {
      b.rule(`group cover reduced by ${groupCoverExcluded} at attained age ${atAge}`);
    } else {
      b.rule(`group cover of ${groupFaceTotal} counted in full, but it halves at 66 and ends at 70`);
    }
  }

  const gap = Math.max(0, needs.insuranceNeed - cover.total);
  if (needs.insuranceNeed - cover.total < 0) b.rule("cover exceeds need — gap floored at zero");

  return {
    need: needs.insuranceNeed,
    inForceCover: cover.total,
    groupCoverExcluded,
    gap,
    provenance: b.build(),
  };
}
