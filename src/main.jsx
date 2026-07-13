import React from "react";
import ReactDOM from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { StoreProvider } from "./store.jsx";
import CrashGuard from "./CrashGuard.jsx";
import App from "./App.jsx";
import "./styles.css";

registerSW({ immediate: true });

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <CrashGuard>
      <StoreProvider>
        <App />
      </StoreProvider>
    </CrashGuard>
  </React.StrictMode>
);
