"use client";
import dynamic from "next/dynamic";

// The editor measures the live DOM, so the tutorial renders in the browser only.
export const TutorialLoader = dynamic(() => import("./tutorial"), {
    ssr: false,
});
