"use client";

import { Package } from "lucide-react";

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  showImage?: boolean;
}

export default function TableSkeleton({ rows = 5, columns = 5, showImage = false }: TableSkeletonProps) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              {showImage && (
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <div className="h-4 w-16 bg-muted rounded animate-pulse" />
                </th>
              )}
              {Array.from({ length: columns }).map((_, i) => (
                <th key={i} className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {Array.from({ length: rows }).map((_, rowIdx) => (
              <tr key={rowIdx} className="hover:bg-muted/30 transition-colors">
                {showImage && (
                  <td className="px-6 py-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-200 to-orange-300 rounded-lg animate-pulse" />
                  </td>
                )}
                {Array.from({ length: columns }).map((_, colIdx) => (
                  <td key={colIdx} className="px-6 py-4">
                    <div className="h-5 bg-muted rounded animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function LoadingState({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="text-center py-12 text-muted-foreground">
      <div className="flex flex-col items-center justify-center">
        <div className="relative w-16 h-16 mb-4">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-200 via-orange-300 to-orange-400 rounded-2xl animate-pulse" />
          <div className="absolute inset-2 bg-gradient-to-br from-orange-100 to-orange-200 rounded-xl" />
          <Package className="absolute inset-0 w-8 h-8 m-auto text-orange-600 opacity-60" />
        </div>
        <p className="text-sm font-medium">{message}</p>
      </div>
    </div>
  );
}

