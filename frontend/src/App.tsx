import "./App.css";

import adapter from "webrtc-adapter";
import Home from "./pages/Home";
import Room from "./pages/Room";
import { AppProvider } from "./Context";
import { useState } from "react";
import { Toaster } from "sonner";

function App() {
  const [view, setView] = useState<"home" | "room">("home");
  // const [view, setView] = useState<"home" | "room">("room");
  return (
    <AppProvider>
      <div className="bg-yellow-50 min-h-screen">
        <Toaster richColors />
        <div className="h-screen flex items-center justify-center mx-auto max-w-2xl">
          {view === "home" && <Home setView={setView} />}
          {view === "room" && <Room />}
        </div>
      </div>
    </AppProvider>
  );
}

export default App;
