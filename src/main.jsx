import { createRoot } from "react-dom/client";
import { StatusBar, Style } from "@capacitor/status-bar";
import { SplashScreen } from "@capacitor/splash-screen";
import { App as CapApp } from "@capacitor/app";
import { SafeArea } from "capacitor-plugin-safe-area";
import { Capacitor } from "@capacitor/core";
import App from "./dr_asif_v23_app.jsx";

CapApp.addListener("backButton", ({ canGoBack }) => {
  if (!canGoBack) {
    CapApp.exitApp();
  } else {
    window.history.back();
  }
});

const initSafeArea = async () => {
  const { insets } = await SafeArea.getSafeAreaInsets();
  for (const [key, value] of Object.entries(insets)) {
    document.documentElement.style.setProperty(
      `--sa-${key}`,
      `${value}px`
    );
  }

  SafeArea.addListener("safeAreaChanged", ({ insets }) => {
    for (const [key, value] of Object.entries(insets)) {
      document.documentElement.style.setProperty(
        `--sa-${key}`,
        `${value}px`
      );
    }
  });
};
initSafeArea();

StatusBar.setStyle({ style: Style.Light });
SplashScreen.hide();

const root = createRoot(document.getElementById("root"));
root.render(<App />);

export const isIOS = Capacitor.getPlatform() === "ios";
