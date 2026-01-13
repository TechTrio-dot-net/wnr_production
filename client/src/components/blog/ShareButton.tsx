"use client";

import { useState } from "react";
import {
  IoShareSocialOutline,
  IoLogoWhatsapp,
  IoLogoInstagram,
  IoLogoTwitter,
  IoLogoFacebook,
  IoLogoLinkedin,
  IoCopyOutline,
  IoCheckmarkCircleOutline,
  IoCloseOutline,
} from "react-icons/io5";

interface ShareButtonProps {
  title: string;
  url: string;
  excerpt?: string;
  image?: string;
}

export default function ShareButton({ title, url, excerpt, image }: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const fullUrl = typeof window !== "undefined" 
    ? `${window.location.origin}${url}`
    : `https://www.wildnroot.com${url}`;

  const shareText = `${title}${excerpt ? ` - ${excerpt.slice(0, 100)}...` : ""}`;

  const shareOptions = [
    {
      name: "WhatsApp",
      icon: IoLogoWhatsapp,
      color: "bg-green-500 hover:bg-green-600",
      action: () => {
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${fullUrl}`)}`;
        window.open(whatsappUrl, "_blank");
      },
    },
    {
      name: "Instagram Story",
      icon: IoLogoInstagram,
      color: "bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:from-purple-600 hover:via-pink-600 hover:to-orange-600",
      action: () => {
        // Instagram story sharing - try app first, then web
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        if (isMobile) {
          // Try to open Instagram app for story creation
          const instagramAppUrl = `instagram://camera`;
          window.location.href = instagramAppUrl;
          // Fallback after a delay
          setTimeout(() => {
            window.open("https://www.instagram.com/", "_blank");
          }, 500);
        } else {
          // Desktop: open Instagram web
          alert("To share on Instagram Story:\n1. Open Instagram app on your phone\n2. Create a new story\n3. Add this link: " + fullUrl);
          window.open("https://www.instagram.com/", "_blank");
        }
      },
    },
    {
      name: "Instagram Feed",
      icon: IoLogoInstagram,
      color: "bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:from-purple-600 hover:via-pink-600 hover:to-orange-600",
      action: () => {
        // Instagram feed post sharing
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        if (isMobile) {
          // Try to open Instagram app
          const instagramAppUrl = `instagram://`;
          window.location.href = instagramAppUrl;
          setTimeout(() => {
            window.open("https://www.instagram.com/", "_blank");
          }, 500);
        } else {
          // Desktop: provide instructions
          alert("To share on Instagram Feed:\n1. Open Instagram app on your phone\n2. Create a new post\n3. Add this link in your caption: " + fullUrl);
          window.open("https://www.instagram.com/", "_blank");
        }
      },
    },
    {
      name: "Twitter",
      icon: IoLogoTwitter,
      color: "bg-blue-400 hover:bg-blue-500",
      action: () => {
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(fullUrl)}`;
        window.open(twitterUrl, "_blank");
      },
    },
    {
      name: "Facebook",
      icon: IoLogoFacebook,
      color: "bg-blue-600 hover:bg-blue-700",
      action: () => {
        const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(fullUrl)}`;
        window.open(facebookUrl, "_blank");
      },
    },
    {
      name: "LinkedIn",
      icon: IoLogoLinkedin,
      color: "bg-blue-700 hover:bg-blue-800",
      action: () => {
        const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(fullUrl)}`;
        window.open(linkedinUrl, "_blank");
      },
    },
    {
      name: "Copy Link",
      icon: copied ? IoCheckmarkCircleOutline : IoCopyOutline,
      color: "bg-neutral-600 hover:bg-neutral-700",
      action: async () => {
        try {
          await navigator.clipboard.writeText(fullUrl);
          setCopied(true);
          setTimeout(() => {
            setCopied(false);
            setIsOpen(false);
          }, 2000);
        } catch (err) {
          // Fallback for older browsers
          const textArea = document.createElement("textarea");
          textArea.value = fullUrl;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand("copy");
          document.body.removeChild(textArea);
          setCopied(true);
          setTimeout(() => {
            setCopied(false);
            setIsOpen(false);
          }, 2000);
        }
      },
    },
  ];

  return (
    <div className="relative">
      {/* Share Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--wnr-berry)] text-white hover:bg-[var(--wnr-berry)]/90 transition-colors font-medium"
        aria-label="Share article"
      >
        <IoShareSocialOutline className="w-5 h-5" />
        <span>Share</span>
      </button>

      {/* Share Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/20"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu */}
          <div className="absolute top-full left-0 mt-2 z-50 bg-white rounded-xl shadow-xl border border-black/10 p-4 min-w-[200px]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-[var(--wnr-text)]">Share Article</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-neutral-100 rounded transition-colors"
                aria-label="Close"
              >
                <IoCloseOutline className="w-5 h-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              {shareOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.name}
                    onClick={() => {
                      option.action();
                      if (option.name !== "Copy Link") {
                        setIsOpen(false);
                      }
                    }}
                    className={`flex flex-col items-center gap-2 p-3 rounded-lg ${option.color} text-white transition-all hover:scale-105 active:scale-95`}
                  >
                    <Icon className="w-6 h-6" />
                    <span className="text-xs font-medium">{option.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

