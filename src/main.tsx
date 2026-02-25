import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import CrashScreen from "./screens/CrashScreen";

function Root() {
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const handler = (event: ErrorEvent) => {
      setError(event.error || new Error(event.message));
    };
    const rejectionHandler = (event: PromiseRejectionEvent) => {
      setError(event.reason || new Error("Unhandled Promise Rejection"));
    };

    window.addEventListener("error", handler);
    window.addEventListener("unhandledrejection", rejectionHandler);

    return () => {
      window.removeEventListener("error", handler);
      window.removeEventListener("unhandledrejection", rejectionHandler);
    };
  }, []);

  if (error) {
    return <CrashScreen error={error} reset={() => setError(null)} />;
  }

  return <App />;
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
