import React from "react";
import { createRoot } from "react-dom/client";
import DebtTool from "./debt-tool.jsx";

const rootNode = document.getElementById("root");
if (!rootNode) throw new Error("Missing #root mount node");

createRoot(rootNode).render(
  <React.StrictMode>
    <DebtTool />
  </React.StrictMode>
);
