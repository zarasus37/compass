"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * App-wide providers. The QueryClient lives in a state slot so it is
 * created exactly once per browser session (and once per server render)
 * and survives HMR without losing cached queries.
 */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Money data should feel instant after a successful load.
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: (failureCount, error) => {
              // Don't retry 4xx — they're client errors. Retry 5xx up to 3x.
              const status =
                typeof error === "object" && error !== null && "status" in error
                  ? (error as { status?: number }).status
                  : undefined;
              if (status !== undefined && status >= 400 && status < 500) {
                return false;
              }
              return failureCount < 3;
            },
          },
          mutations: { retry: false },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
