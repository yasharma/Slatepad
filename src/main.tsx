import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import {
  applyThemeClass,
  getStoredPreference,
  resolveEffectiveTheme,
} from "./hooks/useTheme";
import "./styles/globals.css";

applyThemeClass(resolveEffectiveTheme(getStoredPreference()));

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
