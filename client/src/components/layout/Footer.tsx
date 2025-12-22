import Image from "next/image";
import Link from "next/link";
import { MdEmail, MdPhone } from "react-icons/md";
import { FaCcVisa, FaCcMastercard, FaGooglePay } from "react-icons/fa";
import { SiRazorpay, SiPaytm } from "react-icons/si";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer
      className="text-white text-base md:text-[17px] leading-relaxed"
      style={{
        backgroundColor: "var(--wnr-berry)",
        backgroundImage: "url('/images/banner/POWER_TEXTURE.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="wnr-container py-10 md:py-12">
        {/* GRID */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 md:gap-10">
          {/* Brand / Contact / Socials */}
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/images/wild-root-logo-white.png"
                alt="Wild n' Root"
                width={84}
                height={84}
                priority
              />
              <span className="sr-only">Wild n Root</span>
            </Link>

            <ul className="mt-4 space-y-3 text-[15px] md:text-[16px] leading-relaxed">
              <li>
                <span className="font-semibold inline-flex items-center gap-2">
                  Email:
                </span>{" "}
                <div className="flex flex-col">
                  <a
                    href="mailto:care@wildnroot.com"
                    className="hover:opacity-90"
                  >
                    <MdEmail className="inline-block h-5 w-5" aria-hidden="true" />{" "}
                    care@wildnroot.com (For customer care)
                  </a>
                  <a
                    href="mailto:care@wildnroot.com"
                    className="hover:opacity-90"
                  >
                    <MdEmail className="inline-block h-5 w-5" aria-hidden="true" />{" "}
                    info@wildnroot.com (For Info & Sales)
                  </a>
                </div>
              </li>

              <li>
                <span className="font-semibold inline-flex items-center gap-2">
                  Phone:
                </span>{" "}
                <div className="flex flex-col">
                  <a href="tel:+919824440330" className="hover:opacity-90">
                    <MdPhone className="inline-block h-5 w-5" aria-hidden="true" />{" "}
                    +91 98244 40330 (For customer care)
                  </a>
                  <a href="tel:+919825550708" className="hover:opacity-90">
                    <MdPhone className="inline-block h-5 w-5" aria-hidden="true" />{" "}
                    +91 98255 50708 (For Info & Sales)
                  </a>
                </div>
              </li>

              <li className="max-w-xs">
                <span className="font-semibold">Address:</span>{" "}
                <address className="not-italic opacity-90">
                  GF-28, Manas Complex, Near Jodhpur Cross Roads, Satellite,
                  Ahmedabad - 380015. Gujarat, India.
                </address>
              </li>
            </ul>

            {/* Socials */}
            <div className="mt-5 flex items-center gap-3">
              <SocialLink href="https://www.instagram.com/wildnroot/" label="Instagram">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                  <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm5 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm6.2-1.2a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4z" />
                </svg>
              </SocialLink>
              <SocialLink href="http://linkedin.com/company/wild-n-root/" label="LinkedIn">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                  <path d="M4.98 3.5C4.98 4.88 3.88 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1 4.98 2.12 4.98 3.5zM.5 8h4V24h-4V8zm7.5 0h3.8v2.2h.1c.5-.9 1.7-2.2 4-2.2 4.2 0 5 2.8 5 6.3V24h-4v-7.6c0-1.8 0-4.1-2.5-4.1-2.5 0-2.9 2-2.9 4V24h-4V8z" />
                </svg>
              </SocialLink>
              <SocialLink href="https://www.facebook.com/people/Wild-N-Root/61577858951456/" label="Facebook">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                  <path d="M13.5 22v-8h2.6l.4-3h-3v-2c0-.9.3-1.5 1.6-1.5H17V4.2c-.8-.1-1.7-.2-2.5-.2C12 4 10.5 5.3 10.5 8v3H8v3h2.5v8h3z" />
                </svg>
              </SocialLink>
            </div>
          </div>

          {/* Company */}
          <div className="col-span-1">
            <SectionHeader>Company</SectionHeader>
            <ul className="mt-3 space-y-2 text-[15px] md:text-[18px] opacity-90">
              <li><Link href="/about" className="hover:opacity-80">About</Link></li>
              <li><Link href="/blog" className="hover:opacity-80">Blog</Link></li>
              <li><Link href="/contact" className="hover:opacity-80">Contact</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div className="col-span-1">
            <SectionHeader>Support</SectionHeader>
            <ul className="mt-3 space-y-2 text-[15px] md:text-[18px] opacity-90">
              <li><Link href="/faq" className="hover:opacity-80">FAQs</Link></li>
              <li><Link href="/privacy" className="hover:opacity-80">Privacy</Link></li>
              <li><Link href="/terms" className="hover:opacity-80">Terms</Link></li>
              <li><Link href="/shipping" className="hover:opacity-80">Shipment</Link></li>
              <li><Link href="/contact" className="hover:opacity-80">Get Help</Link></li>
            </ul>
          </div>

          {/* Shop */}
          <div className="col-span-1 md:order-none">
            <SectionHeader>Shop</SectionHeader>
            <ul className="mt-3 space-y-2 text-[15px] md:text-[18px] opacity-90">
              <li><Link href="/products" className="hover:opacity-80">All Products</Link></li>
            </ul>
          </div>
        </div>

        {/* Payment Icons + Bottom Bar */}
        <div className="mt-10 border-t border-white/15 pt-6 flex flex-col md:flex-row justify-between items-center text-center opacity-90 gap-6 text-[12px] ">
          <p style={{ fontSize: '18px' }}>© {year} Wild n' Root ™. All rights reserved.</p>

          {/* Payment Icons */}
          <div className="flex items-center justify-center gap-5 text-2xl md:text-3xl">
            <Tooltip label="Razorpay">
              <SiRazorpay className="text-white hover:text-sky-400 transition-all duration-300 hover:scale-110" />
            </Tooltip>
            <Tooltip label="Visa">
              <FaCcVisa className="text-white hover:text-blue-400 transition-all duration-300 hover:scale-110" />
            </Tooltip>
            <Tooltip label="MasterCard">
              <FaCcMastercard className="text-white hover:text-orange-500 transition-all duration-300 hover:scale-110" />
            </Tooltip>
            <Tooltip label="RuPay">
              <span className="group inline-flex items-center">
                <svg viewBox="0 0 64 24" width={50} height={24}>
                  <defs>
                    <linearGradient id="rupayGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#ff7a00" />
                      <stop offset="100%" stopColor="#273c8f" />
                    </linearGradient>
                  </defs>
                  <text
                    x="0"
                    y="18"
                    fontSize="16"
                    fontWeight="bold"
                    fontFamily="Arial, sans-serif"
                    fill="white"
                    className="transition-all duration-300 group-hover:fill-[url(#rupayGradient)]"
                  >
                    RuPay
                  </text>
                </svg>
              </span>
            </Tooltip>
            <Tooltip label="Google Pay">
              <FaGooglePay className="text-white hover:text-green-400 transition-all duration-300 hover:scale-110" />
            </Tooltip>
            <Tooltip label="Paytm">
              <SiPaytm className="text-white hover:text-sky-300 transition-all duration-300 hover:scale-110" />
            </Tooltip>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ------- bits ------- */
function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="font-semibold tracking-wider uppercase pt-4 border-t border-white/15 md:pt-0 md:border-0" style={{ fontSize: '24px' }}>
      {children}
    </h4>
  );
}

function SocialLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="inline-grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 transition"
      title={label}
    >
      {children}
    </a>
  );
}

function Tooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="relative inline-flex items-center justify-center group">
      <div className="outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded-full">
        {children}
      </div>
      <div
        className="absolute top-8 left-1/2 -translate-x-1/2 z-20 pointer-events-none opacity-0
          group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150"
        aria-hidden="true"
      >
        <span className="rounded-full bg-black/55 backdrop-blur px-3 py-1 text-xs whitespace-nowrap">
          {label}
        </span>
      </div>
    </div>
  );
}
