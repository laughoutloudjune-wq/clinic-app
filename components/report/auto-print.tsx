"use client";

import { useEffect } from "react";

export default function AutoPrint() {
  useEffect(() => {
    const id = window.setTimeout(() => {
      window.print();
    }, 300);
    return () => window.clearTimeout(id);
  }, []);

  return null;
}
