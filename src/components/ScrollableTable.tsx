import type { ReactNode } from "react";

/**
 * Wraps a table in a horizontally scrollable container on mobile.
 * On desktop (md+), it scrolls normally.
 */
export function ScrollableTable({ children }: { children: ReactNode }) {
  return (
    <div className="w-full overflow-x-auto -mx-1 px-1">
      <div className="min-w-[640px]">{children}</div>
    </div>
  );
}
