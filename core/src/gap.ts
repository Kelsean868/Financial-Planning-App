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

  // The ledger owns the eligibility filter and reports the group face it actually
  // counted. Re-deriving it here once dropped the policy-type exclusion, so a group
  // critical-illness rider — common on T&T group schemes — read as group death cover
  // that had already been reduced.
  const groupFaceTotal = cover.groupFaceTotal;
  const groupCoverExcluded = groupFaceTotal - cover.group;

  if (groupFaceTotal > 0) {
    // Record the group-life parameters ONLY when the household actually has group
    // cover: they are the rules that most change the number here, so they must carry
    // their source and be status-checked — but a client with no group cover should not
    // have them in their audit trail at all.
    b.use("group_life.reduction_age");
    b.use("group_life.reduction_factor");
    const termination = b.useNode("group_life.termination_age");
    // The termination age is sourced from a single carrier's terms. A client whose
    // number moves because of it is entitled to know that the scheme it came from
    // may not be theirs.
    if (typeof termination.node.warning === "string") b.caveat(termination.node.warning);

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
