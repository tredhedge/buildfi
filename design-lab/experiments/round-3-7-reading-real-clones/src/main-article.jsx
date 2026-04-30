import React from "react";
import { createRoot } from "react-dom/client";
import MeltdownArticle from "./article-meltdown";

const rootNode = document.getElementById("root");
if (!rootNode) throw new Error("Missing #root mount node");

createRoot(rootNode).render(
  <React.StrictMode>
    <MeltdownArticle />
  </React.StrictMode>
);
