import React from "react";
import { createRoot } from "react-dom/client";
import Guide101Page from "./guide101";

const rootNode = document.getElementById("root");
if (!rootNode) throw new Error("Missing #root mount node");

createRoot(rootNode).render(
  <React.StrictMode>
    <Guide101Page />
  </React.StrictMode>
);
