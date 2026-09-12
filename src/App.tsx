import { useEffect, useState } from "react";
import "./App.css";
import { currentWindowLabel } from "./tauri";
import { MainApp } from "./MainApp";
import { Widget } from "./Widget";

function App() {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    setLabel(currentWindowLabel());
  }, []);

  if (label === null) return null;
  return label === "widget" ? <Widget /> : <MainApp />;
}

export default App;
