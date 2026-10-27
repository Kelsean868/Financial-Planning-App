/** Errors the fact-finder engine raises. Each fails loudly; none clamps silently. */

/** Care graph brief §8: an impossible timeline (study or care start before current age, horizon under 10). */
export class CareGraphInputError extends Error {
  override name = "CareGraphInputError";
}

/** Closing brief §8: a required upstream engine did not run, or a scope record is malformed. Never substitute a default. */
export class ClosingInputError extends Error {
  override name = "ClosingInputError";
}

/**
 * Section 1 §1.1: facts that fail `LifeCaseFacts` validation. The portal's store wraps this in
 * its own `LifeCaseStoreError` and writes nothing.
 */
export class LifeCaseFactsError extends Error {
  override name = "LifeCaseFactsError";
  readonly problems: readonly string[];
  constructor(problems: readonly string[]) {
    super(`LifeCaseFacts invalid: ${problems.join("; ")}`);
    this.problems = Object.freeze([...problems]);
  }
}

/** Addendum §12.3: a registered annuity routing for a client who may not have one. The engine refuses. */
export class RegisteredRoutingError extends Error {
  override name = "RegisteredRoutingError";
}
