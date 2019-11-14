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

  const transitions = {
    on: {
      on: function(newConnectivity: Connectivity) {
        clearTimeout(offlineDelayTimer);
        offlineDelayTimerOn = false;
        setReal(newConnectivity);
      },
      off: function() {
        if (!offlineDelayTimerOn) {
          offlineDelayTimerOn = true;
          offlineDelayTimer = setTimeout(() => {
            setReal("offline");
            offlineDelayTimerOn = false;
          }, 800);
        }
      }
    },
    off: {
      off: function() {
        clearTimeout(onlineDelayTimer);
        pendingOnlineState = undefined;
      },
      on: function(newConnectivity: Connectivity) {
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
    }
  };

  return {
    get: () => current,
    set: function(newConnectivity: Connectivity) {
      if (current === "crashed") return;
      if (newConnectivity === "crashed") return setReal(newConnectivity);

      const from = current === "offline" ? "off" : "on";
      const to = newConnectivity === "offline" ? "off" : "on";
      transitions[from][to](newConnectivity);
    }
  };
}
