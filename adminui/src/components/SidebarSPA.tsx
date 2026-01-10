"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import wildrootLogo from "../../public/wild-root-logo-white.png";
import {
  HiHome,
  HiShoppingBag,
  HiArchive,
  HiShoppingCart,
  HiDocumentText,
  HiCreditCard,
  HiTruck,
  HiChartBar,
  HiCog,
  HiUsers,
  HiTag,
  HiChatAlt2,
  HiX,
  HiClipboardList,
} from "react-icons/hi";

const navigationItems = [
  { name: "Dashboard", href: "/", icon: <HiHome className="w-5 h-5" /> },
  { name: "Products", href: "/products", icon: <HiShoppingBag className="w-5 h-5" /> },
  { name: "Inventory", href: "/inventory", icon: <HiArchive className="w-5 h-5" /> },
  { name: "Orders", href: "/orders", icon: <HiShoppingCart className="w-5 h-5" /> },
  { name: "Blogs", href: "/blogs", icon: <HiDocumentText className="w-5 h-5" /> },
  { name: "Sales & Payments", href: "/sales-payments", icon: <HiCreditCard className="w-5 h-5" /> },
  { name: "Shipping", href: "/shipping", icon: <HiTruck className="w-5 h-5" /> },
  { name: "Reports", href: "/reports", icon: <HiChartBar className="w-5 h-5" /> },
  { name: "Settings", href: "/settings", icon: <HiCog className="w-5 h-5" /> },
  { name: "User Management", href: "/user-management", icon: <HiUsers className="w-5 h-5" /> },
  { name: "Offer Strip", href: "/offer-strip", icon: <HiTag className="w-5 h-5" /> },
  { name: "Ingredients Strip", href: "/ingredients-strip", icon: <HiTag className="w-5 h-5" /> },
  { name: "Coupons", href: "/coupons", icon: <HiTag className="w-5 h-5" /> },
  { name: "Discounts", href: "/discounts", icon: <HiTag className="w-5 h-5" /> },
  { name: "Testimonials", href: "/testimonials", icon: <HiChatAlt2 className="w-5 h-5" /> },
  { name: "Logs", href: "/logs", icon: <HiClipboardList className="w-5 h-5" /> },
];

export default function SidebarSPA() {
  const pathname = usePathname();
  const router = useRouter();

  const handleNavigation = (href: string) => {
    // Use shallow routing to prevent full page reload
    router.push(href, { scroll: false });
  };

  return (
    <div className="w-72 bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white h-screen fixed md:relative z-50 flex flex-col shadow-2xl border-r border-gray-700 animate-slideInLeft" suppressHydrationWarning>
      {/* Header */}
      <div className="p-6 border-b border-gray-700 bg-gray-900 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 flex items-center justify-center shadow-lg">
            <Image
              src={wildrootLogo}
              alt="Logo"
              width={32}
              height={32}
              className="object-contain"
            />
          </div>
          <div>
            <h1 className="heading-sm text-white font-display">Wild n Root</h1>
            <p className="caption text-gray-400">Admin Panel</p>
          </div>
        </div>
        <button className="md:hidden p-2 rounded-lg hover:bg-gray-800 transition-colors hover-scale">
          <HiX className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-6 px-4">
        <div className="mb-8">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 mb-4">
            Main Menu
          </h2>
          <ul className="space-y-2">
            {navigationItems.slice(0, 7).map((item) => (
              <li key={item.name}>
                <button
                  onClick={() => handleNavigation(item.href)}
                  className={`w-full flex items-center px-4 py-3 rounded-xl transition-all duration-200 group text-left ${
                    pathname === item.href
                      ? "bg-gradient-to-r from-rose-900 to-pink-900 text-white shadow-lg"
                      : "text-gray-300 hover:bg-gray-700 hover:text-white hover:translate-x-1"
                  }`}
                  suppressHydrationWarning
                >
                  <span className={`mr-3 transition-colors ${
                    pathname === item.href ? "text-white" : "text-gray-400 group-hover:text-white"
                  }`}>
                    {item.icon}
                  </span>
                  <span className="font-medium">{item.name}</span>
                  {pathname === item.href && (
                    <div className="ml-auto w-2 h-2 bg-white rounded-full"></div>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 mb-4">
            Management
          </h2>
          <ul className="space-y-2">
            {navigationItems.slice(8).map((item) => (
              <li key={item.name}>
                <button
                  onClick={() => handleNavigation(item.href)}
                  className={`w-full flex items-center px-4 py-3 rounded-xl transition-all duration-200 group text-left ${
                    pathname === item.href
                      ? "bg-gradient-to-r from-rose-900 to-pink-900 text-white shadow-lg"
                      : "text-gray-300 hover:bg-gray-700 hover:text-white hover:translate-x-1"
                  }`}
                  suppressHydrationWarning
                >
                  <span className={`mr-3 transition-colors ${
                    pathname === item.href ? "text-white" : "text-gray-400 group-hover:text-white"
                  }`}>
                    {item.icon}
                  </span>
                  <span className="font-medium">{item.name}</span>
                  {pathname === item.href && (
                    <div className="ml-auto w-2 h-2 bg-white rounded-full"></div>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-700 bg-gray-900">
        <div className="text-center">
          <p className="text-xs text-gray-400">© 2025 Wild n Root</p>
        </div>
      </div>
    </div>
  );
}
