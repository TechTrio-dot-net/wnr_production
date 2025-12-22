// src/components/charts/RevenueChart.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

type Dataset = {
  label: string;
  data: number[];
  borderColor?: string;
  backgroundColor?: string;
  tension?: number;
  fill?: boolean;
  pointBackgroundColor?: string;
  pointBorderColor?: string;
  pointHoverBackgroundColor?: string;
  pointHoverBorderColor?: string;
};

interface RevenueChartProps {
  data: {
    labels: string[];
    datasets: Dataset[];
  };
  title?: string;
}

export default function RevenueChart({
  data,
  title = "Revenue Trends",
}: RevenueChartProps) {
  // Avoid hydration/theme flicker by rendering after mount
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Read theme tokens from CSS variables so it auto-updates on theme toggle
  const tokens = useMemo(() => {
    if (!mounted) {
      // safe defaults before mount
      return {
        primary: "#b34725",
        card: "#ffffff",
        textMuted: "#6b7280",
        border: "rgba(0,0,0,0.08)",
        tooltipBg: "#ffffff",
        tooltipTitle: "#111827",
        tooltipBody: "#4b5563",
        isDark: false,
      };
    }
    const root = getComputedStyle(document.documentElement);

    const read = (name: string, fallback: string) =>
      (root.getPropertyValue(name)?.trim() || fallback);

    // primary is kept as raw (hex) in tailwind config per earlier setup
    const primary = read("--primary", "#b34725");

    // These are HSL tokens in your globals; wrap them with hsl()
    const card = `hsl(${read("--card", "0 0% 100%")})`;
    const mutedFg = `hsl(${read("--muted-foreground", "215.4 16.3% 46.9%")})`;
    const borderHsl = `hsl(${read("--border", "214.3 31.8% 91.4%")})`;
    const foreground = `hsl(${read("--foreground", "222.2 47.4% 11.2%")})`;
    const bg = `hsl(${read("--background", "0 0% 100%")})`;

    // simple dark detection: dark themes usually have low-light backgrounds
    // (no reliance on next-themes; purely CSS-var driven)
    // We'll treat it as dark if background lightness < 25%
    const isDark = (() => {
      try {
        // parse ... hsl(h s% l%) → get l%
        const m = bg.match(/hsl\(([^)]+)\)/i)?.[1]?.split(/\s+/);
        const l = m ? m[m.length - 1] : "0%";
        const lNum = Number(String(l).replace("%", ""));
        return lNum < 25;
      } catch {
        return false;
      }
    })();

    return {
      primary,
      card,
      textMuted: mutedFg,
      border: borderHsl,
      tooltipBg: isDark ? card : "#ffffff",
      tooltipTitle: foreground,
      tooltipBody: mutedFg,
      isDark,
    };
  }, [mounted]);

  const options = useMemo<ChartOptions<"line">>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top",
          labels: {
            color: tokens.textMuted,
            font: { family: "'Inter', system-ui, sans-serif", size: 12 },
            usePointStyle: true,
            boxWidth: 8,
            boxHeight: 8,
            padding: 18,
          },
        },
        title: { display: false },
        tooltip: {
          backgroundColor: tokens.tooltipBg,
          titleColor: tokens.tooltipTitle,
          bodyColor: tokens.tooltipBody,
          borderColor: tokens.border,
          borderWidth: 1,
          padding: 12,
          cornerRadius: 8,
          usePointStyle: true,
          callbacks: {
            label: (ctx) => {
              const y = ctx.parsed?.y;
              if (typeof y !== "number" || Number.isNaN(y)) return "";
              return `₹${y.toLocaleString()}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { color: tokens.border, drawBorder: false },
          ticks: {
            color: tokens.textMuted,
            font: { family: "'Inter', system-ui, sans-serif", size: 11 },
          },
        },
        y: {
          beginAtZero: true,
          grid: { color: tokens.border, drawBorder: false },
          ticks: {
            color: tokens.textMuted,
            font: { family: "'Inter', system-ui, sans-serif", size: 11 },
            callback: (v) => `₹${Number(v).toLocaleString()}`,
          },
        },
      },
      elements: {
        line: { tension: 0.35, borderWidth: 3 },
        point: {
          radius: 3.5,
          hoverRadius: 6,
          backgroundColor: tokens.card,
          borderWidth: 2,
          hoverBorderWidth: 3,
        },
      },
      interaction: { intersect: false, mode: "index" },
      animation: { duration: 350 },
    }),
    [tokens]
  );

  const themedData = useMemo(() => {
    const defaultFill = tokens.isDark
      ? "40%" // darker fill in dark mode
      : "20%";

    // Prefer color-mix if available; else fallback to alpha-hex
    const supportColorMix =
      typeof CSS !== "undefined" &&
      "supports" in CSS &&
      CSS.supports("color: color-mix(in srgb, black, white)");

    const makeFill = (base: string) =>
      supportColorMix
        ? `color-mix(in srgb, ${base} ${defaultFill}, transparent)`
        : `${base}33`; // ~20% alpha (#RRGGBB33)

    const basePrimary = tokens.primary || "#b34725";

    return {
      labels: data.labels,
      datasets: data.datasets.map((ds) => {
        const line = ds.borderColor ?? basePrimary;
        return {
          ...ds,
          borderColor: line,
          backgroundColor: ds.backgroundColor ?? makeFill(line),
          fill: ds.fill ?? true,
          tension: ds.tension ?? 0.35,
          pointBackgroundColor: ds.pointBackgroundColor ?? line,
          pointBorderColor: ds.pointBorderColor ?? tokens.card,
          pointHoverBackgroundColor: ds.pointHoverBackgroundColor ?? line,
          pointHoverBorderColor: ds.pointHoverBorderColor ?? tokens.card,
        };
      }),
    };
  }, [data, tokens]);

  if (!mounted) {
    // lightweight skeleton to prevent hydration issues
    return (
      <div className="bg-card rounded-2xl border border-border p-5 md:p-6">
        <div className="h-6 w-44 rounded bg-muted animate-pulse mb-4" />
        <div className="h-64 w-full rounded bg-muted animate-pulse" />
      </div>
    );
  }

  return (
    <div className="bg-card text-card-foreground rounded-2xl border border-border shadow-md p-5 md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base md:text-lg font-semibold">{title}</h2>
        <span className="inline-block w-2 h-2 rounded-full bg-primary" />
      </div>
      <div className="h-64 w-full">
        <Line options={options} data={themedData} />
      </div>
    </div>
  );
}
