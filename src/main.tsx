import { createRoot } from "react-dom/client";
import Onboarding from "./app/Onboarding";
import "./styles/onboarding.css";
import "./styles/app.css";
import { mobileDevice } from "./lib/ar/mobile";
createRoot(document.getElementById("root")!).render(
  <div className={mobileDevice() ? "device mobile" : "device desktop"}>
    <div className="phone-screen">
      <Onboarding />
    </div>
  </div>,
);
