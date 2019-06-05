import { PushResult } from "../../network/types";
import { Data } from "../types";

const defaultRetries = 15;

type Params<Domain> = {
  canonData: Data<Domain>;
  onError: (err: Error) => void;
  onNetPush: <K extends keyof Domain>(params: {
    kind: K;
    id: string;
    lastSeenRevision: string;
    pushId: string;
    value: Domain[K];
  }) => void;
  shouldCrashWrites: () => boolean;
};

export function makePush<Domain>(params: Params<Domain>) {
  const { canonData, onError, onNetPush, shouldCrashWrites } = params;

  let pushCounter = 0;
  const pendingPushes: {
    [id: string]: { [k in PushResult]: (() => void) | undefined };
  } = {};

  async function attemptPush<K extends keyof Domain>(params: {
    kind: K;
    id: string;
    deltas: ((prev: Domain[K]) => Domain[K])[];
    retriesRemaining: number;
  }): Promise<void> {
    if (shouldCrashWrites()) {
      return new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Simulate write failure")), 2000);
      });
    }

    const { kind, id, deltas, retriesRemaining } = params;

    const curr = canonData[kind][id];
    if (!curr)
      throw new Error(
        `Pushing to ${kind} while the canon data is empty is not yet implemented. Proper implementation turns on observing here, waits for the data and tries to push.`
      );

    const value = deltas.reduce((v, delta) => delta(v), curr.value);

    const pushId = `push-${pushCounter++}`;
    return new Promise(function(resolve, reject) {
      pendingPushes[pushId] = {
        conflict: () =>
          // Server and the connection are healthy, so reset the retries
          // We can resolve conflicts infinitely, it’s the internal errors that
          // we need to limit retries.
          attemptPush({ ...params, retriesRemaining: defaultRetries })
            .then(resolve)
            .catch(reject),
        internalError: () => {
          // As many other pieces of this code, the retry logic needs
          // cleaner refactoring
          if (retriesRemaining === 0)
            return reject(new Error(`Write failed after all retries`));
          setTimeout(function() {
            attemptPush({ ...params, retriesRemaining: retriesRemaining - 1 })
              .then(resolve)
              .catch(reject);
          }, 3000);
        },
        success: resolve
      };
      onNetPush({
        kind,
        id,
        pushId,
        lastSeenRevision: curr.revision,
        value
      });
    });
  }

  const queuedTasks: {
    [k in keyof Domain]?: {
      [id: string]: {
        delta: (prev: Domain[k]) => Domain[k];
        resolve: () => void;
      }[];
    }
  } = {};
  function queuedTasksFor<K extends keyof Domain>(kind: K, id: string) {
    queuedTasks[kind] = queuedTasks[kind] || {};
    queuedTasks[kind]![id] = queuedTasks[kind]![id] || [];
    return queuedTasks[kind]![id]!;
  }

  async function performPush<K extends keyof Domain>(kind: K, id: string) {
    const taskQueue = queuedTasksFor(kind, id);
    const tasks = taskQueue.slice();
    taskQueue.splice(0);

    try {
      await attemptPush({
        kind,
        id,
        deltas: tasks.map(t => t.delta),
        retriesRemaining: defaultRetries
      });
    } catch (err) {
      onError(err);
    }
    tasks.forEach(t => t.resolve());
  }

  return {
    onResult: function(pushId: string, result: PushResult) {
      if (pendingPushes[pushId]) {
        const handler = pendingPushes[pushId][result];
        if (!handler)
          throw new Error(`Not implemented push result handler for ${result}`);
        handler();
        delete pendingPushes[pushId];
      }
    },
    push: async function<K extends keyof Domain>(
      kind: K,
      id: string,
      delta: (prev: Domain[K]) => Domain[K]
    ) {
      return new Promise<void>(resolve => {
        queuedTasksFor(kind, id).push({ delta, resolve });
        performPush(kind, id);
      });
    }
  };
}
