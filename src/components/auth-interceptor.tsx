"use client";

import { useEffect } from "react";

export function AuthInterceptor() {
  useEffect(() => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const token = localStorage.getItem("rf_token");
      if (token) {
        const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        if (url.startsWith("/api/")) {
          init = {
            ...init,
            headers: {
              ...(init?.headers || {}),
              Authorization: `Bearer ${token}`,
            },
          };
        }
      }
      return originalFetch(input, init);
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  return null;
}
