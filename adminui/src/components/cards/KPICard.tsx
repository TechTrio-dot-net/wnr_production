// src/components/cards/KPICard.tsx
"use client";

import React from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  loading?: boolean;
  color?: "primary" | "blue" | "green" | "orange";
}

export default function KPICard({
  title,
  value,
  icon,
  trend,
  loading,
  color = "primary",
}: KPICardProps) {
  if (loading) {
    return (
      <div className="h-32 rounded-2xl animate-pulse bg-muted/50 border border-border/50" />
    );
  }

  const colorStyles = {
    primary: "bg-primary/10 text-primary",
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    green: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    orange: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  };

  return (
    <div
      className="
        relative overflow-hidden rounded-2xl p-6 transition-all duration-300
        bg-card/50 backdrop-blur-sm border border-border/50
        hover:shadow-lg hover:border-primary/20 hover:-translate-y-1
        group
      "
    >
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <div className={`scale-150 transform ${colorStyles[color].split(" ")[1]}`}>
          {/* Background decorative icon could go here */}
        </div>
      </div>

      <div className="flex items-start justify-between mb-4">
        <div
          className={`
            flex items-center justify-center p-3 rounded-xl
            ${colorStyles[color]}
            shadow-sm ring-1 ring-inset ring-black/5
          `}
        >
          <div className="w-6 h-6 flex items-center justify-center text-lg">
            {icon}
          </div>
        </div>

        {trend && (
          <div className={`
            flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full
            ${trend.isPositive
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "bg-rose-500/10 text-rose-600 dark:text-rose-400"}
          `}>
            {trend.isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            <span>{trend.value}%</span>
          </div>
        )}
      </div>

      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-1">{title}</h3>
        <p className="text-3xl font-bold tracking-tight text-foreground">{value}</p>
      </div>
    </div>
  );
}

