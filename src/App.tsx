import { useState } from "react";
import "./App.css";
import Drawer from "./components/drawer";

function App() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{ height: "100dvh" }}>
      {/* <div>
        <div style={{ height: "100%", backgroundColor: "pink", position: "fixed", inset: 0 }}></div>
        <div style={{ height: "70%", backgroundColor: "red", position: "fixed", inset: 0 }}></div>
        <div style={{ height: "30%", backgroundColor: "blue", position: "fixed", inset: 0 }}></div>
      </div> */}
      <button onClick={() => setIsOpen(true)}>Open Drawer</button>
      <Drawer isOpen={isOpen} onOpenChange={setIsOpen}>
        <div style={{ height: "100dvh", backgroundColor: "skyblue" }}>content</div>
      </Drawer>
    </div>
  );
}

export default App;
