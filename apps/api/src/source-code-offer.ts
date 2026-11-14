import type { NextFunction, Request, Response } from 'express';

const REPOSITORY = 'https://github.com/willehpeh/market-miam';

/**
 * Where this running build's source lives.
 *
 * AGPL-3.0 §13 asks for the Corresponding Source of *this* version, not of
 * whatever the default branch happens to hold, so pin the deployed revision when
 * we know it. Render sets RENDER_GIT_COMMIT in both build and runtime env; off
 * Render (local, tests) there is no revision to pin and the branch is the honest
 * answer.
 */
export function sourceCodeUrl(commit = process.env.RENDER_GIT_COMMIT): string {
  return commit ? `${REPOSITORY}/tree/${commit}` : REPOSITORY;
}

// The API is a covered work users reach over the network, and it has no UI of its
// own to carry the AGPL §13 offer — so every response points at its own source.
export function offerSourceCode(_req: Request, res: Response, next: NextFunction) {
  res.setHeader(sourceCodeHeader, sourceCodeUrl());
  next();
}

export const sourceCodeHeader = 'X-Source-Code';
