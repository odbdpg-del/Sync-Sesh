import type { CSSProperties } from "react";
import type { StartupProgress, StartupProgressStep } from "../lib/startup/startupProgress";

interface LoadingScreenProps {
  progress: StartupProgress;
}

interface ProgressStyle extends CSSProperties {
  "--loading-progress": string;
}

function getStatusLabel(status: StartupProgressStep["status"]) {
  switch (status) {
    case "pending":
      return "Queued";
    case "active":
      return "Loading";
    case "complete":
      return "Ready";
    case "degraded":
      return "Degraded";
    case "error":
      return "Check";
  }
}

export function LoadingScreen({ progress }: LoadingScreenProps) {
  return (
    <section className="loading-screen" aria-label="Sync Sesh startup progress" aria-live="polite">
      <div className="loading-screen-shell">
        <div className="loading-screen-header">
          <p className="loading-screen-eyebrow">Sync Sesh</p>
          <h1>Linking the room</h1>
          <p>{progress.blockingReason ?? "Getting the shared session ready."}</p>
        </div>

        <div className="loading-screen-overall" aria-label={`Required startup progress ${progress.requiredProgress}%`}>
          <div className="loading-screen-overall-copy">
            <span>Startup</span>
            <strong>{progress.requiredProgress}%</strong>
          </div>
          <div className="loading-screen-bar" aria-hidden="true">
            <span style={{ "--loading-progress": `${progress.requiredProgress}%` } as ProgressStyle} />
          </div>
        </div>

        <div className="loading-screen-steps">
          {progress.steps.map((step) => (
            <article className="loading-screen-step" data-status={step.status} data-required={step.required ? "true" : undefined} key={step.id}>
              <div className="loading-screen-step-heading">
                <div>
                  <strong>{step.label}</strong>
                  <p>{step.detail}</p>
                </div>
                <span>{getStatusLabel(step.status)}</span>
              </div>
              <div className="loading-screen-step-bar" aria-label={`${step.label} ${step.progress}%`}>
                <span style={{ "--loading-progress": `${step.progress}%` } as ProgressStyle} />
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
