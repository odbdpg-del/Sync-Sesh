const OFFLINE_MODE_STORAGE_KEY = "sync-sesh-offline-mode";

function getSessionStorage() {
  if (typeof window === "undefined") {
    return undefined;
  }

  try {
    return window.sessionStorage;
  } catch {
    return undefined;
  }
}

export function isOfflineModeEnabled() {
  return getSessionStorage()?.getItem(OFFLINE_MODE_STORAGE_KEY) === "true";
}

export function enableOfflineMode() {
  getSessionStorage()?.setItem(OFFLINE_MODE_STORAGE_KEY, "true");
}
