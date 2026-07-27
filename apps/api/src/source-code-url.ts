const REPOSITORY = 'https://github.com/willehpeh/market-miam';

/**
 * Where this running build's source lives.
 *
 * AGPL-3.0 §13 asks for the Corresponding Source of *this* version, not of
 * whatever the default branch happens to hold, so pin the deployed revision when
 * we know it. Render sets RENDER_GIT_COMMIT in both build and runtime env; off
 * Render (local, tests) there is no revision to pin and the branch is the honest
 * answer.
 *
 * admin-api keeps its own copy — the two deploy independently.
 */
export function sourceCodeUrl(commit = process.env.RENDER_GIT_COMMIT): string {
  return commit ? `${REPOSITORY}/tree/${commit}` : REPOSITORY;
}
