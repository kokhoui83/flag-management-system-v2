import { ApiError } from './client';
import type { ValidationProblem } from './types';

/** Human-readable message of a failed operation; RFC 9457 `detail` when the API supplied one. */
export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

/** All-at-once validation problems carried by an API problem document (FR-14), else none. */
export function apiValidationProblems(error: unknown): ValidationProblem[] {
  return error instanceof ApiError ? (error.problem?.errors ?? []) : [];
}
