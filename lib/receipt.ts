import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { currencyFromCents } from "@/lib/utils";

type ReceiptInput = {
  orderId: string;
  storeName: string;
  buyerName: string;
  productName: string;
  qty: number;
  totalCents: number;
  createdAt: string;
};

export async function buildReceiptPdf(input: ReceiptInput) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  page.drawText("Receipt", {
    x: 50,
    y: 780,
    size: 28,
    font: bold,
    color: rgb(0.1, 0.1, 0.1),
  });

  const lines = [
    `Order ID: ${input.orderId}`,
    `Store: ${input.storeName}`,
    `Buyer: ${input.buyerName}`,
    `Product: ${input.productName}`,
    `Quantity: ${input.qty}`,
    `Total: ${currencyFromCents(input.totalCents)}`,
    `Created At: ${new Date(input.createdAt).toLocaleString("en-MY")}`,
  ];

  lines.forEach((line, i) => {
    page.drawText(line, {
      x: 50,
      y: 730 - i * 28,
      size: 14,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });
  });

  page.drawText("Thank you for supporting local Raya kuih sellers.", {
    x: 50,
    y: 90,
    size: 12,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });

  return pdfDoc.save();
}
