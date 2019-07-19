import { PushResult } from "../../network/types";
import { Data, Transaction, TransactionAction } from "../types";
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
    actions: TransactionAction<Domain, K>[];
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
      actions,
      previousConflictOnRevision,
      retriesRemaining
    } = params;

    const curr = canonData[kind][id];

    const value = actions.reduce((prev, action) => {
      if ("creation" in action) return action.creation;
      if (!prev)
        throw new Error(
          `Pushing to ${kind} while the canon data is empty is not yet implemented. Proper implementation turns on observing here, waits for the data and tries to push.`
        );
      return action.delta(prev);
    }, curr && curr.value);
    if (!value)
      throw new Error(
        `Some transaction on ${kind} ${id} returned a falsy value.`
      );

    const lastSeenRevision = curr ? curr.revision : "creating-new-item";
    const pushId = `push-${pushCounter++}`;
    const result = await onNetPush({
      kind,
      id,
      pushId,
      lastSeenRevision,
      value
    });
    if (result === "conflict") {
      if (lastSeenRevision === "creating-new-item") {
        throw new Error(
          `Failed to create new item ${kind} ${id}. Check whether the server correctly allows creating new items and that your id is uniqely generated.`
        );
      }
      if (
        previousConflictOnRevision &&
        lastSeenRevision === previousConflictOnRevision
      ) {
        throw new Error(
          `The revision ${lastSeenRevision} is not changing and the server keeps responding with a conflict. Check whether the server is correctly incrementing the revision, whether the server is correctly sending updates with new revisions, and whether the client is subscribed to updates on ${kind} ${id}.`
        );
      }
      // Server and the connection are healthy, so reset the retries
      // We can resolve conflicts infinitely, it’s the internal errors that
      // we need to limit retries.
      return await attemptPush({
        ...params,
        previousConflictOnRevision: lastSeenRevision,
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
        action: TransactionAction<Domain, k>;
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
        actions: tasks.map(t => t.action),
        retriesRemaining: defaultRetries
      });
    } catch (err) {
      onError(err);
    }
    tasks.forEach(t => t.resolve());
  }

  const run = makeThrottled<keyof Domain>(performPush);
  return function(transaction: Transaction<Domain>) {
    const { kind, id } = transaction;
    return new Promise<void>(resolve => {
      queuedTasksFor(kind, id).push({ action: transaction, resolve });
      run(kind, id);
    });
  };
}
