import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/global.css";

window.__HIDE_BOOTSTRAP_STATUS__?.();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
