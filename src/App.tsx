import { MainScreen } from "./screens/MainScreen";
import { AuthHarnessScreen } from "./screens/AuthHarnessScreen";
import { AuthHarnessErrorBoundary } from "./screens/AuthHarnessErrorBoundary";

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const isAuthHarness = params.get("authHarness") === "1" || window.location.pathname === "/auth-harness";

  if (isAuthHarness) {
    return (
      <AuthHarnessErrorBoundary>
        <AuthHarnessScreen />
      </AuthHarnessErrorBoundary>
    );
  }

  return <MainScreen />;
}

