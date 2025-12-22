"use client";

import React, { useEffect, useState, useRef } from "react";
import { Bell, Package, Star, AlertTriangle, PackageX } from "lucide-react";
import { http } from "@/lib/api";
import Link from "next/link";

type Notification = {
  id: string;
  type: "new_order" | "pending_review" | "shipment_issue" | "low_stock";
  title: string;
  message: string;
  timestamp: string;
  link: string;
  read: boolean;
};

type NotificationData = {
  counts: {
    newOrders: number;
    pendingReviews: number;
    shipmentIssues: number;
    lowStock: number;
    total: number;
  };
  notifications: Notification[];
};

// Notification sound (using Web Audio API for a simple beep)
function playNotificationSound() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const audioContext = new AudioCtx();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800; // Higher pitch
    oscillator.type = "sine";

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);

    // Play a second beep for better notification
    setTimeout(() => {
      const oscillator2 = audioContext.createOscillator();
      const gainNode2 = audioContext.createGain();

      oscillator2.connect(gainNode2);
      gainNode2.connect(audioContext.destination);

      oscillator2.frequency.value = 1000;
      oscillator2.type = "sine";

      gainNode2.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

      oscillator2.start(audioContext.currentTime);
      oscillator2.stop(audioContext.currentTime + 0.2);
    }, 150);
  } catch (error) {
    console.error("Failed to play notification sound:", error);
  }
}

export default function NotificationBell() {
  const [data, setData] = useState<NotificationData | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const previousCountRef = useRef<number>(0);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const result = await http<NotificationData>("/api/admin/notifications");
      setData(result);

      // Play sound if new notifications arrived
      if (previousCountRef.current > 0 && result.counts.total > previousCountRef.current) {
        playNotificationSound();
      }
      previousCountRef.current = result.counts.total;
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
      // Set empty data on error to prevent crashes
      setData({
        counts: { newOrders: 0, pendingReviews: 0, shipmentIssues: 0, lowStock: 0, total: 0 },
        notifications: [],
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getIcon = (type: Notification["type"]) => {
    switch (type) {
      case "new_order":
        return <Package className="w-4 h-4 text-blue-500" />;
      case "pending_review":
        return <Star className="w-4 h-4 text-yellow-500" />;
      case "shipment_issue":
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case "low_stock":
        return <PackageX className="w-4 h-4 text-orange-500" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const totalCount = data?.counts.total || 0;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors relative"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {totalCount > 0 && (
          <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold ring-2 ring-background">
            {totalCount > 9 ? "9+" : totalCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-popover border border-border rounded-xl shadow-xl z-50 max-h-[500px] flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold text-sm">Notifications</h3>
            {totalCount > 0 && (
              <span className="text-xs text-muted-foreground">
                {totalCount} {totalCount === 1 ? "notification" : "notifications"}
              </span>
            )}
          </div>

          {/* Notification List */}
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Loading...</div>
            ) : data && data.notifications.length > 0 ? (
              <div className="divide-y divide-border">
                {data.notifications.map((notif) => (
                  <Link
                    key={notif.id}
                    href={notif.link}
                    onClick={() => setIsOpen(false)}
                    className="block p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">{getIcon(notif.type)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{notif.title}</p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {notif.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatTime(notif.timestamp)}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No notifications
              </div>
            )}
          </div>

          {/* Footer with counts */}
          {data && data.counts.total > 0 && (
            <div className="p-3 border-t border-border bg-muted/30">
              <div className="grid grid-cols-2 gap-2 text-xs">
                {data.counts.newOrders > 0 && (
                  <div className="flex items-center gap-2">
                    <Package className="w-3 h-3 text-blue-500" />
                    <span>{data.counts.newOrders} New Orders</span>
                  </div>
                )}
                {data.counts.pendingReviews > 0 && (
                  <div className="flex items-center gap-2">
                    <Star className="w-3 h-3 text-yellow-500" />
                    <span>{data.counts.pendingReviews} Reviews</span>
                  </div>
                )}
                {data.counts.shipmentIssues > 0 && (
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-3 h-3 text-red-500" />
                    <span>{data.counts.shipmentIssues} Issues</span>
                  </div>
                )}
                {data.counts.lowStock > 0 && (
                  <div className="flex items-center gap-2">
                    <PackageX className="w-3 h-3 text-orange-500" />
                    <span>{data.counts.lowStock} Low Stock</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
