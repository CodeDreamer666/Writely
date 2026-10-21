"use client";
import dynamic from "next/dynamic";

// The editor measures the live DOM (viewport, fonts, text ranges), so it renders in the browser only.
export const WritelyLoader = dynamic(() => import("./writely-app"), {
    ssr: false,
});
