import React, { useState, useEffect } from "react";
import { ThemeProvider } from "./context/ThemeContext";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { Landing } from "./pages/Landing";
import { AppMain } from "./pages/AppMain";
import { Settings } from "./pages/Settings";
import { About } from "./pages/About";
import { Privacy } from "./pages/Privacy";

export const AppContent: React.FC = () => {
  const [route, setRoute] = useState(() => {
    return window.location.hash || "#/";
  });

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(window.location.hash || "#/");
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // Keyboard Shortcuts (Linear / Raycast Style)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in input fields
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.tagName === "SELECT")
      ) {
        return;
      }

      if (e.altKey) {
        let targetRoute = "";
        switch (e.key.toLowerCase()) {
          case "c":
            targetRoute = "#/app";
            break;
          case "s":
            targetRoute = "#/settings";
            break;
          case "a":
            targetRoute = "#/about";
            break;
          case "p":
            targetRoute = "#/privacy";
            break;
          case "h":
            targetRoute = "#/";
            break;
          default:
            return;
        }
        e.preventDefault();
        setRoute(targetRoute);
        window.location.hash = targetRoute;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const renderPage = () => {
    switch (route) {
      case "#/":
        return <Landing setRoute={setRoute} />;
      case "#/app":
        return <AppMain />;
      case "#/settings":
        return <Settings />;
      case "#/about":
        return <About />;
      case "#/privacy":
        return <Privacy />;
      default:
        return <Landing setRoute={setRoute} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-all duration-200">
      <Navbar currentRoute={route} setRoute={setRoute} />
      <main className="flex-1 w-full relative">
        {renderPage()}
      </main>
      <Footer setRoute={setRoute} />
    </div>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
