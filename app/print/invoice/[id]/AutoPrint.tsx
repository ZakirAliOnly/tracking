"use client";
import { useEffect } from "react";

export function AutoPrint() {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 800);
    return () => clearTimeout(t);
  }, []);
  return null;
}
