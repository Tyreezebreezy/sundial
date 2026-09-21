import { useEffect, useState } from "react";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/visuals.css";
import "./styles/app.css";
import "./styles/widget.css";
import { currentWindowLabel } from "./tauri";
import { MainApp } from "./MainApp";
import { Widget } from "./widget/Widget";

function App() {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    setLabel(currentWindowLabel());
  }, []);

  if (label === null) return null;
  return label === "widget" ? <Widget /> : <MainApp />;
}

export default App;
