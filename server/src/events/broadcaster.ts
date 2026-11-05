/**
 * Per-(project, environment) change-event broadcaster (ADR-0008; roadmap M2/M3).
 *
 * Committed flag changes are queued per flag set; the SSE stream drains a flag set's
 * queue when the bound flagd provider reports that it applied a new model
 * (`provider-configuration-changed`), so a `flag-changed` event never fires ahead of what
 * flagd actually serves (FR-51/FR-29).
 */

export interface QueuedFlagChange {
  flagKey: string;
  version: number;
  /** ISO-8601 commit time used for the event `at` field. */
  at: string;
  auditId?: string;
}

export interface FlagChangeBroadcaster {
  /** Queue a committed change for the (project, environment) flag set. */
  enqueue(flagSetId: string, change: QueuedFlagChange): void;
  /** Drain (and clear) the queued changes of one flag set; returns the drained entries. */
  drain(flagSetId: string): QueuedFlagChange[];
  /** Queued-but-not-yet-discharged changes of one flag set. */
  queued(flagSetId: string): QueuedFlagChange[];
}

export class InMemoryFlagChangeBroadcaster implements FlagChangeBroadcaster {
  private readonly queues = new Map<string, QueuedFlagChange[]>();

  enqueue(flagSetId: string, change: QueuedFlagChange): void {
    const queue = this.queues.get(flagSetId) ?? [];
    queue.push(change);
    this.queues.set(flagSetId, queue);
  }

  drain(flagSetId: string): QueuedFlagChange[] {
    const queue = this.queues.get(flagSetId);
    if (!queue || queue.length === 0) {
      return [];
    }
    this.queues.delete(flagSetId);
    return queue;
  }

  queued(flagSetId: string): QueuedFlagChange[] {
    return this.queues.get(flagSetId) ?? [];
  }
}
