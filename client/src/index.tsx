
import { ChakraProvider } from "@chakra-ui/react";
import React from "react";
import ReactDOM from "react-dom/client";

import Background from "./components/common/Background";
import Layout from "./components/common/Layout";

import "./style/anim.css";
import "./style/font.css";
import "./style/index.css";

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);

root.render(
    <React.StrictMode>
        <ChakraProvider>
            <Background />
            <Layout />
        </ChakraProvider>
    </React.StrictMode>
);
