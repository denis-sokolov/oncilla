import { PushResult } from "../../network/types";
import { Data } from "../types";
import { makeThrottled } from "./throttled";

const defaultRetries = 15;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

type Params<Domain> = {
  canonData: Data<Domain>;
  onError: (err: Error) => void;
  onNetPush: <K extends keyof Domain>(params: {
    kind: K;
    id: string;
    lastSeenRevision: string;
    pushId: string;
    value: Domain[K];
  }) => Promise<PushResult<Domain[K]>>;
  onUpdate: <K extends keyof Domain>(params: {
    kind: K;
    id: string;
    newRevision: string;
    newValue: Domain[K];
  }) => void;
  shouldCrashWrites: () => boolean;
};

export function makePush<Domain>(params: Params<Domain>) {
  const { canonData, onError, onNetPush, onUpdate, shouldCrashWrites } = params;

  let pushCounter = 0;

  async function attemptPush<K extends keyof Domain>(params: {
    kind: K;
    id: string;
    deltas: ((prev: Domain[K]) => Domain[K])[];
    retriesRemaining: number;
    previousConflictOnRevision?: string;
  }): Promise<void> {
    if (shouldCrashWrites()) {
      await sleep(2000);
      throw new Error("Simulate write failure");
    }

    const {
      kind,
      id,
      deltas,
      previousConflictOnRevision,
      retriesRemaining
    } = params;

    const curr = canonData[kind][id];
    if (!curr)
      throw new Error(
        `Pushing to ${kind} while the canon data is empty is not yet implemented. Proper implementation turns on observing here, waits for the data and tries to push.`
      );

    const value = deltas.reduce((v, delta) => delta(v), curr.value);

    const pushId = `push-${pushCounter++}`;
    const result = await onNetPush({
      kind,
      id,
      pushId,
      lastSeenRevision: curr.revision,
      value
    });
    if (result === "conflict") {
      if (
        previousConflictOnRevision &&
        curr.revision === previousConflictOnRevision
      ) {
        throw new Error(
          `The revision ${
            curr.revision
          } is not changing and the server keeps responding with a conflict. Check whether the server is correctly incrementing the revision and whether the client is subscribed to updates on ${kind} ${id}.`
        );
      }
      // Server and the connection are healthy, so reset the retries
      // We can resolve conflicts infinitely, it’s the internal errors that
      // we need to limit retries.
      return await attemptPush({
        ...params,
        previousConflictOnRevision: curr.revision,
        retriesRemaining: defaultRetries
      });
    }
    if (result === "internalError") {
      // As many other pieces of this code, the retry logic needs
      // cleaner refactoring
      if (retriesRemaining === 0)
        throw new Error(`Write failed after all retries`);
      await sleep(3000);
      return await attemptPush({
        ...params,
        retriesRemaining: retriesRemaining - 1
      });
    }
    if (typeof result === "object") {
      onUpdate({ kind, id, ...result });
      return;
    }
    throw new Error(`Unexpected result ${result}`);
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

  const run = makeThrottled<keyof Domain>(performPush);
  return function<K extends keyof Domain>(
    kind: K,
    id: string,
    delta: (prev: Domain[K]) => Domain[K]
  ) {
    return new Promise<void>(resolve => {
      queuedTasksFor(kind, id).push({ delta, resolve });
      run(kind, id);
    });
  };
}
