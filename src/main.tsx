import { createRoot } from "react-dom/client";
import App from "./app/App";
import "./styles/app.css";
import { mobileDevice } from "./lib/ar/mobile";
createRoot(document.getElementById("root")!).render(
  <div className={mobileDevice() ? "device mobile" : "device desktop"}>
    <div className="phone-screen">
      <App />
    </div>
  </div>,
);
