import { createRoot } from "react-dom/client";
import { StatusBar, Style } from "@capacitor/status-bar";
import { SplashScreen } from "@capacitor/splash-screen";
import { App as CapApp } from "@capacitor/app";
import App from "./dr_asif_v21_app.jsx";

CapApp.addListener("backButton", ({ canGoBack }) => {
  if (!canGoBack) {
    CapApp.exitApp();
  } else {
    window.history.back();
  }
});

StatusBar.setStyle({ style: Style.Light });
SplashScreen.hide();

const root = createRoot(document.getElementById("root"));
root.render(<App />);
