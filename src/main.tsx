import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource/space-grotesk/400.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/600.css";
import "@fontsource/space-grotesk/700.css";
import "@fontsource/oxanium/600.css";
import "@fontsource/oxanium/700.css";
import "@fontsource/oxanium/800.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/ibm-plex-mono/700.css";
import App from "./App";
import "./styles/global.css";

declare global {
  interface Window {
    __AUTH_HARNESS_BOOT_STATUS__?: {
      hide: () => void;
      setDetail: (detail: string) => void;
      setPhase: (phase: string) => void;
    };
    __HIDE_BOOTSTRAP_STATUS__?: () => void;
  }
}

function isAuthHarnessRoute() {
  const params = new URLSearchParams(window.location.search);
  return params.get("authHarness") === "1" || window.location.pathname === "/auth-harness";
}

function installAuthHarnessBootstrapStatus() {
  if (!isAuthHarnessRoute()) {
    window.__HIDE_BOOTSTRAP_STATUS__?.();
    return;
  }

  const existing = document.getElementById("auth-harness-bootstrap-status");

  if (existing) {
    return;
  }

  const status = document.createElement("div");
  status.id = "auth-harness-bootstrap-status";
  status.className = "auth-harness-bootstrap-status";
  status.innerHTML = `
    <div class="auth-harness-bootstrap-card">
      <span class="auth-harness-kicker">Bug 1 Attempt 5</span>
      <strong>Harness Booting</strong>
      <span class="auth-harness-bootstrap-phase">main.tsx:loaded</span>
      <p class="auth-harness-bootstrap-detail">Waiting for React and the Discord harness to mount.</p>
    </div>
  `;
  document.body.appendChild(status);

  const phaseNode = status.querySelector(".auth-harness-bootstrap-phase");
  const detailNode = status.querySelector(".auth-harness-bootstrap-detail");

  window.__AUTH_HARNESS_BOOT_STATUS__ = {
    hide: () => {
      status.remove();
    },
    setPhase: (phase: string) => {
      if (phaseNode) {
        phaseNode.textContent = phase;
      }
    },
    setDetail: (detail: string) => {
      if (detailNode) {
        detailNode.textContent = detail;
      }
    },
  };
}

installAuthHarnessBootstrapStatus();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
