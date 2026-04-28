import { MainScreen } from "./screens/MainScreen";
import { AuthHarnessScreen } from "./screens/AuthHarnessScreen";

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const isAuthHarness = params.get("authHarness") === "1" || window.location.pathname === "/auth-harness";

  if (isAuthHarness) {
    return <AuthHarnessScreen />;
  }

  return <MainScreen />;
}

