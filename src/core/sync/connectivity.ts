/**
 * This over-complicated state machine ensures that we throttle
 * our transition to the offline mode, and then stay longer in it,
 * without jumping back and forth too often.
 */

import { Connectivity } from "../types";

export function makeConnectivity(params: { onConnectivityChange: () => void }) {
  const { onConnectivityChange } = params;

  let current: Connectivity = "connecting";

  let pendingOnlineState: Connectivity | undefined;
  let onlineDelayTimer: ReturnType<typeof setTimeout>;

  let offlineDelayTimerOn = false;
  let offlineDelayTimer: ReturnType<typeof setTimeout>;

  function setReal(c: Connectivity) {
    current = c;
    onConnectivityChange();
  }

  return {
    get: () => current,
    set: function(newConnectivity: Connectivity) {
      if (current === "crashed") return;
      if (newConnectivity === "crashed") return setReal(newConnectivity);

      if (current === "offline") {
        if (newConnectivity === "offline") {
          // off -> off
          clearTimeout(onlineDelayTimer);
          pendingOnlineState = undefined;
        } else {
          // off -> on
          if (pendingOnlineState) {
            pendingOnlineState = newConnectivity;
          } else {
            pendingOnlineState = newConnectivity;
            onlineDelayTimer = setTimeout(() => {
              if (!pendingOnlineState) return;
              setReal(pendingOnlineState);
              pendingOnlineState = undefined;
            }, 800);
          }
        }
      } else {
        if (newConnectivity === "offline") {
          // on -> off
          if (!offlineDelayTimerOn) {
            offlineDelayTimerOn = true;
            offlineDelayTimer = setTimeout(() => {
              setReal(newConnectivity);
              offlineDelayTimerOn = false;
            }, 800);
          }
        } else {
          // on -> on
          clearTimeout(offlineDelayTimer);
          offlineDelayTimerOn = false;
          setReal(newConnectivity);
        }
      }
    }
  };
}
