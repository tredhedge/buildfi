import React from "react";
import { createRoot } from "react-dom/client";
import Guide201Page from "./guide201";

const rootNode = document.getElementById("root");
if (!rootNode) throw new Error("Missing #root mount node");

createRoot(rootNode).render(
  <React.StrictMode>
    <Guide201Page />
  </React.StrictMode>
);
