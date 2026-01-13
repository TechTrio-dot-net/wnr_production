// /src/app/api/eshopbox/order/route.ts
import { NextRequest, NextResponse } from "next/server";

const ESHOPBOX_BASE = process.env.ESHOPBOX_BASE_URL || "https://wms.eshopbox.com";
const ESHOPBOX_TOKEN = process.env.ESHOPBOX_TOKEN!;
const ESB_LOCATION_CODE = process.env.ESB_LOCATION_CODE!; // mapped inside ESB to pickup pincode 380015

type ItemIn = {
  id: string;           // your product id / sku
  name: string;
  qty: number;
  unitPrice: number;    // inclusive of tax
  imageUrl: string;
};

type AddressIn = {
  fullName: string;
  line1: string;
  city: string;
  state: string;
  pincode: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // expected from client AFTER verify success:
    const {
      orderNumber,             // your internal order ref (string)
      invoiceNumber,           // e.g. WNR_0001
      subtotal,                // numbers are optional if you pass grandTotal
      promoDiscount = 0,
      voucherDiscount = 0,
      shipping = 0,
      grandTotal,              // invoiceTotal to send to ESB
      items,                   // ItemIn[]
      address,                 // AddressIn
      dimensions               // optional override { length, breadth, height, weight }
    }: {
      orderNumber: string;
      invoiceNumber: string;
      subtotal?: number;
      promoDiscount?: number;
      voucherDiscount?: number;
      shipping?: number;
      grandTotal: number;
      items: ItemIn[];
      address: AddressIn;
      dimensions?: { length: number; breadth: number; height: number; weight: number; };
    } = body;

    if (!orderNumber || !invoiceNumber || !grandTotal || !items?.length || !address?.pincode) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Build shipmentId from invoice number (your rule)
    const shipmentId = `SHIP_${invoiceNumber}`;

    // Minimal items for ESB (required only)
    const esbItems = items.map((it) => ({
      itemID: it.id,                       // sku / unique id
      productTitle: it.name,
      quantity: it.qty,
      itemTotal: Number((it.unitPrice * it.qty).toFixed(2)), // inclusive taxes
      productImageUrl: it.imageUrl || "https://wildnroot.com/product-placeholder.png"
    }));

    // Default dims if none provided
    const DEFAULT = { length: 12, breadth: 12, height: 12, weight: 500 };
    const dims = { ...DEFAULT, ...(dimensions || {}) };

    // Build Eshopbox minimal payload (prepaid, fixed pickup)
    const esbPayload = {
      shipmentId,
      isCOD: false,
      invoiceTotal: Number(grandTotal.toFixed(2)),
      shippingAddress: {
        customerName: address.fullName || "Customer",
        addressLine1: address.line1,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        country: "India"
      },
      items: esbItems,
      shipmentDimension: {
        length: Number(dims.length),
        breadth: Number(dims.breadth),
        height: Number(dims.height),
        weight: Number(dims.weight)
      },
      pickupLocation: {
        locationCode: ESB_LOCATION_CODE
      }
    };

    const res = await fetch(`${ESHOPBOX_BASE}/api/v1/shipping/order`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ESHOPBOX_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(esbPayload)
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        { error: "Eshopbox create shipment failed", statusText: res.statusText, body: text },
        { status: 502 }
      );
    }

    const esb = await res.json(); // { trackingId, label_url, courierName, ... }

    // === Persist to your DB ===
    // Replace this block with your real Order update:
    // await OrderModel.updateOne(
    //   { orderNumber },
    //   {
    //     $set: {
    //       invoiceNumber,
    //       shipmentId,
    //       "shipping.esbPosted": true,
    //       "shipping.courierName": esb.courierName || null,
    //       "shipping.trackingId": esb.trackingId || null,
    //       "shipping.labelUrl": esb.label_url || null,
    //       "shipping.shippingMode": esb.shippingMode || null,
    //       "shipping.esbResponse": esb,
    //       "shipping.postedAt": new Date()
    //     }
    //   }
    // );

    return NextResponse.json({
      ok: true,
      orderNumber,
      invoiceNumber,
      shipmentId,
      courierName: esb.courierName || null,
      trackingId: esb.trackingId || null,
      labelUrl: esb.label_url || null,
      shippingMode: esb.shippingMode || null,
      esb
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}
