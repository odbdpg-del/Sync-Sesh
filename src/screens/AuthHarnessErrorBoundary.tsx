import { Component, type ReactNode } from "react";

interface AuthHarnessErrorBoundaryProps {
  children: ReactNode;
}

interface AuthHarnessErrorBoundaryState {
  error?: Error;
}

export class AuthHarnessErrorBoundary extends Component<
  AuthHarnessErrorBoundaryProps,
  AuthHarnessErrorBoundaryState
> {
  state: AuthHarnessErrorBoundaryState = {};

  static getDerivedStateFromError(error: Error): AuthHarnessErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error) {
    if (typeof window === "undefined") {
      return;
    }

    window.__AUTH_HARNESS_BOOT_STATUS__?.setPhase("react:error-boundary");
    window.__AUTH_HARNESS_BOOT_STATUS__?.setDetail(error.message || "Unknown React render error.");
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <div className="auth-harness-stage">
        <main className="auth-harness-shell panel">
          <header className="auth-harness-header">
            <div>
              <span className="auth-harness-kicker">Bug 1 Attempt 5</span>
              <h1>Discord Harness Crashed</h1>
              <p>The harness hit a React render error before it could show runtime auth results.</p>
            </div>
          </header>

          <section className="auth-harness-log-panel">
            <div className="auth-harness-log-header">
              <strong>Crash Detail</strong>
              <span>react error boundary</span>
            </div>
            <div className="auth-harness-log-list" aria-live="polite">
              <div className="auth-harness-log-line auth-harness-log-error">
                <span className="auth-harness-log-label">react:render:failed</span>
                <span className="auth-harness-log-detail"> - {this.state.error.message || "Unknown React render error."}</span>
              </div>
            </div>
          </section>
        </main>
      </div>
    );
  }
}
