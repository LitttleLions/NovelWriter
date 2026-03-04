"use client";

import { useEffect, useRef } from "react";

export function AuthInterceptor() {
  const originalFetchRef = useRef<typeof fetch | null>(null);

  useEffect(() => {
    if (originalFetchRef.current) return;

    const originalFetch = window.fetch.bind(window);
    originalFetchRef.current = originalFetch;

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const token = localStorage.getItem("rf_token");
      if (token) {
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
            ? input.toString()
            : (input as Request).url;

        if (url.startsWith("/api/")) {
          const existingHeaders =
            init?.headers instanceof Headers
              ? Object.fromEntries((init.headers as Headers).entries())
              : (init?.headers as Record<string, string>) || {};

          init = {
            ...init,
            headers: {
              ...existingHeaders,
              Authorization: `Bearer ${token}`,
            },
          };
        }
      }
      return originalFetch(input, init);
    };

    return () => {
      if (originalFetchRef.current) {
        window.fetch = originalFetchRef.current;
        originalFetchRef.current = null;
      }
    };
  }, []);

  return null;
}
