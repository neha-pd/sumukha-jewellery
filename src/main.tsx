import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

const restoredPath = new URLSearchParams(window.location.search).get("p");
if (restoredPath?.startsWith(import.meta.env.BASE_URL)) {
  window.history.replaceState(null, "", restoredPath);
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
