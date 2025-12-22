// src/lib/invoice.ts
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { AdminOrderDetail } from "@/lib/api";

/**
 * Professional ecommerce invoice generator matching the design specification.
 * - Brand color, spacing, fonts
 * - Billing/Shipping grid
 * - Meta details (Invoice, Order, Payment)
 * - Items table with totals
 * - Amount in words, signature, declaration
 */

// Type the jsPDF instance augmented by jspdf-autotable
type JsPDFInstance = InstanceType<typeof jsPDF>;
type JsPDFWithAutoTable = JsPDFInstance & {
  lastAutoTable?: { finalY?: number };
};

export async function renderInvoicePDF(order: AdminOrderDetail) {
  const doc = new jsPDF({ unit: "pt", format: "a4" }) as JsPDFWithAutoTable;
  const left = 40;
  const right = 555; // ~ page width - right margin

  // Brand identity
  const BRAND = "Wild n' Root";
  const COMPANY = "FAMAN ENDEAVORS LLP";
  const BRAND_COLOR: [number, number, number] = [114, 47, 55]; // #722F37
  const PAN_NO = "AAIFF6051G";
  const LOGO_URL = "https://res.cloudinary.com/dob666wa0/image/upload/v1761601822/wnr/uploads/file_p4t1k2.png";
  const GOOD_HABIT_URL = "https://res.cloudinary.com/dob666wa0/image/upload/v1761773345/Good_habbit_ub2ix0.png";

  // Use "Rs." instead of "₹" for better PDF font compatibility
  const cur = (n?: number) => {
    const num = typeof n === "number" ? n : 0;
    const formatted = num.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `Rs. ${formatted}`;
  };

  // Helper to load image as base64
  const loadImageAsDataUrl = async (url: string): Promise<string | null> => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  };

  // Load images
  const [logoDataUrl, goodHabitDataUrl] = await Promise.all([
    loadImageAsDataUrl(LOGO_URL),
    loadImageAsDataUrl(GOOD_HABIT_URL),
  ]);

  // Set background color (light beige)
  doc.setFillColor(250, 245, 240);
  doc.rect(0, 0, 595, 842, "F");

  // -------------------- Header --------------------
  // "INVOICE" title - large, bold, top-left
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(...BRAND_COLOR);
  doc.text("INVOICE", left, 45);

  // Logo in top-right
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "PNG", right - 90, 15, 75, 28);
    } catch {
      // Fallback to text if image fails
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(...BRAND_COLOR);
      doc.text("Wild n' Root™", right - 20, 45, { align: "right" });
    }
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...BRAND_COLOR);
    doc.text("Wild n' Root™", right - 20, 45, { align: "right" });
  }

  // Seller information block
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...BRAND_COLOR);
  doc.text("Sold By:", left, 70);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(30);
  let sellerY = 85;
  doc.text(`${BRAND}`, left, sellerY);
  sellerY += 12;
  doc.text(COMPANY, left, sellerY);
  sellerY += 12;
  doc.text("GF 28, Manas Complex, Nr. Jodhpur Cross Roads,", left, sellerY);
  sellerY += 12;
  doc.text("Ahmedabad - 380015. Gujarat (INDIA).", left, sellerY);
  sellerY += 12;
  doc.text(`PAN NO.: ${PAN_NO}`, left, sellerY);

  // -------------------- Invoice Meta --------------------
  const invoiceNo = `INV${String(order.orderNumber ?? order.id)
    .replace(/\D+/g, "")
    .slice(-6)
    .padStart(6, "0")}`;

  const placedISO = order.placedAt || order.createdAt || "";
  const date = placedISO
    ? new Date(placedISO).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

  const payment =
    (order.payment?.method || "").toLowerCase() === "cod"
      ? "Cash on Delivery"
      : "Prepaid";

  const metaLeft = 320;
  const metaTop = 70;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  const meta: [string, string][] = [
    ["Invoice No:", invoiceNo],
    ["Invoice Date:", date],
    ["Order No:", order.orderNumber || `WNR_${String(order.orderNumber ?? order.id).replace(/\D+/g, "").slice(-4).padStart(4, "0")}`],
    ["Order Date:", date],
    ["Payment Method:", payment],
  ];
  meta.forEach(([label, value], i) => {
    const y = metaTop + i * 12;
    doc.text(label, metaLeft, y);
    doc.setFont("helvetica", "normal");
    doc.text(value, metaLeft + 95, y);
    doc.setFont("helvetica", "bold");
  });

  // -------------------- Customer & Order Details --------------------
  let y = 155;
  doc.setDrawColor(180);
  doc.line(left, y, right, y);
  y += 18;

  // Customer Details (Left Column)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...BRAND_COLOR);
  doc.text("Customer Details", left, y);
  y += 15;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(30);
  const customerName = order.addressSnapshot?.name || "—";
  doc.text(`Name: ${customerName}`, left, y);
  y += 13;

  const bill = formatAddr(order.addressSnapshot);
  doc.text(`Billing Address: ${bill}`, left, y, { maxWidth: 240 });
  y += 25;

  const ship = formatAddr(order.addressSnapshot);
  doc.text(`Shipping Address: ${ship}`, left, y, { maxWidth: 240 });
  const leftColEnd = y + 25;

  // Draw vertical line
  doc.setDrawColor(180);
  doc.line(300, 173, 300, leftColEnd);

  // Invoice & Order Information (Right Column)
  let rightY = 173;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...BRAND_COLOR);
  doc.text("Invoice & Order Information", 320, rightY);
  rightY += 15;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(30);
  meta.forEach(([label, value]) => {
    doc.text(`${label} ${value}`, 320, rightY);
    rightY += 13;
  });

  y = Math.max(leftColEnd, rightY + 5);
  doc.setDrawColor(180);
  doc.line(left, y, right, y);

  // -------------------- Items Table --------------------
  const rows = order.items.map((it, i) => [
    String(i + 1),
    it.name || "Item",
    String(it.qty || 1),
    cur(it.price),
    cur((it.qty || 1) * (it.price || 0)),
  ]);

  autoTable(doc, {
    startY: y + 12,
    head: [["#", "Description", "Qty", "Unit Price", "Total"]],
    body: rows,
    theme: "striped",
    styles: { 
      fontSize: 9, 
      cellPadding: 6,
      lineColor: [180, 180, 180],
      lineWidth: 0.5,
    },
    headStyles: { 
      fillColor: BRAND_COLOR, 
      textColor: 255,
      fontStyle: "bold",
      fontSize: 9,
      cellPadding: 6,
    },
    alternateRowStyles: {
      fillColor: [255, 255, 255],
    },
    columnStyles: {
      0: { cellWidth: 30, halign: "center" },
      1: { cellWidth: 240 },
      2: { cellWidth: 40, halign: "right" },
      3: { cellWidth: 90, halign: "right" },
      4: { cellWidth: 100, halign: "right", fontStyle: "bold" },
    },
    margin: { left, right: 40 },
  });

  const tableEnd = doc.lastAutoTable?.finalY ?? y + 40;

  // -------------------- Summary of Charges --------------------
  const sub = Number(order.subtotal || 0);
  const shipCost = Number(order.shipping || 0);
  const couponDiscount = Number(order.coupon?.discountAmount || 0);
  const grand = Number(
    typeof order.total === "number" ? order.total : sub + shipCost - couponDiscount
  );

  let ty = tableEnd + 20;
  const summaryLeft = right - 180;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(30);
  doc.text("Subtotal:", summaryLeft, ty);
  doc.text(cur(sub), right, ty, { align: "right" });
  ty += 14;
  
  // Coupon discount if applicable
  if (couponDiscount > 0 && order.coupon) {
    doc.text(`Coupon (${order.coupon.code}):`, summaryLeft, ty);
    doc.setTextColor(0, 128, 0); // Green for discount
    doc.text(`-${cur(couponDiscount)}`, right, ty, { align: "right" });
    doc.setTextColor(30); // Reset to black
    ty += 14;
  }
  
  doc.text("Shipping:", summaryLeft, ty);
  doc.text(cur(shipCost), right, ty, { align: "right" });
  ty += 18;
  
  // Grand total with emphasis
  doc.setDrawColor(180);
  doc.line(summaryLeft, ty - 2, right, ty - 2);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...BRAND_COLOR);
  doc.text("Grand Total:", summaryLeft, ty);
  doc.text(cur(grand), right, ty, { align: "right" });

  // -------------------- Payment Information --------------------
  ty += 35;
  doc.setDrawColor(180);
  doc.line(left, ty, right, ty);
  ty += 18;

  // Payment Information (Left Column)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(30);
  doc.text(`Payment: ${payment}`, left, ty);
  ty += 13;
  doc.text(`Amount received: ${cur(grand)}`, left, ty);
  ty += 13;
  doc.setFont("helvetica", "bold");
  doc.text("Amount in words:", left, ty);
  doc.setFont("helvetica", "normal");
  doc.text(inrToWords(Math.round(grand)), left, ty + 13, { maxWidth: 300 });

  // "For Faman Endeavours LLP" (Right Column)
  const forY = ty;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...BRAND_COLOR);
  doc.text("For Faman Endeavours LLP", right, forY, { align: "right" });

  // -------------------- Footer --------------------
  ty += 50;
  doc.setDrawColor(180);
  doc.line(left, ty, right, ty);
  ty += 18;

  // Contact Information
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(30);
  doc.text(
    "Call: +91 98244 40330 (Customer Care), +91 98255 50708 (Info & Sales)",
    left,
    ty
  );
  ty += 11;
  doc.text("E-mail: info@wildnroot.com", left, ty);
  ty += 11;
  doc.text("Website: www.wildnroot.com", left, ty);
  ty += 18;

  // Terms & Conditions
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...BRAND_COLOR);
  doc.text("Terms & Conditions:", left, ty);
  ty += 11;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(30);
  const terms = [
    "1. Goods once sold will neither be taken back nor any amount refunded.",
    "2. All rates are strictly net. Applicable taxes will be charged extra.",
    "3. No claim in respect of our invoice or any complaint towards the services done will be entertained unless notified to us immediately.",
    "4. All disputes are subject to Ahmedabad Jurisdiction.",
  ];
  terms.forEach((term) => {
    doc.text(term, left + 8, ty, { maxWidth: 500 });
    ty += 11;
  });

  ty += 8;
  // Declaration
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(
    "Declaration: Certified that the particulars given above are true and correct.",
    left,
    ty
  );

  // "a good habit" logo (bottom right)
  if (goodHabitDataUrl) {
    try {
      doc.addImage(goodHabitDataUrl, "PNG", right - 45, ty - 5, 35, 35);
    } catch {
      // Fallback to text if image fails
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...BRAND_COLOR);
      doc.circle(right - 30, ty + 10, 15, "F");
      doc.setTextColor(255, 255, 255);
      doc.text("✓", right - 30, ty + 15, { align: "center" });
      doc.setTextColor(...BRAND_COLOR);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.text("a good habit™", right - 30, ty + 30, { align: "center" });
    }
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...BRAND_COLOR);
    doc.circle(right - 30, ty + 10, 15, "F");
    doc.setTextColor(255, 255, 255);
    doc.text("✓", right - 30, ty + 15, { align: "center" });
    doc.setTextColor(...BRAND_COLOR);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text("a good habit™", right - 30, ty + 30, { align: "center" });
  }

  doc.save(`invoice-${order.orderNumber || order.id}.pdf`);
}

// -------- Helpers --------
function formatAddr(a: AdminOrderDetail["addressSnapshot"]) {
  if (!a) return "—";
  return [a.line1, a.line2, `${a.city}, ${a.state} – ${a.pincode}`]
    .filter(Boolean)
    .join(", ");
}

function inrToWords(num: number) {
  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];
  if (num === 0) return "Zero Rupees Only";
  const chunks: string[] = [];
  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const hundred = Math.floor((num % 1000) / 100);
  const rest = num % 100;
  const t = (n: number) =>
    n < 20 ? ones[n] : tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
  if (crore) chunks.push(t(crore) + " Crore");
  if (lakh) chunks.push(t(lakh) + " Lakh");
  if (thousand) chunks.push(t(thousand) + " Thousand");
  if (hundred) chunks.push(ones[hundred] + " Hundred");
  if (rest) chunks.push(t(rest));
  return chunks.join(" ") + " Rupees Only";
}
