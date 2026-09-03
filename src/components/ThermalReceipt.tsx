export interface ThermalReceiptData {
  receiptNumber: string;
  amount: number;
  paymentChannel: string;
  paymentDate: number;
  issuedTo: string;
  planType: string;
  contractNumber: string;
  issuedByName: string;
  companyName?: string;
}

export function ThermalReceiptHTML(data: ThermalReceiptData): string {
  const date = new Date(data.paymentDate);
  const dateStr = date.toLocaleDateString("en-PH");
  const timeStr = date.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" });

  const amount = new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(data.amount);

  return `
    <div style="font-family: 'Courier New', monospace; font-size: 12px; width: 280px; padding: 8px; color: #000; background: #fff;">
      <div style="text-align: center; border-bottom: 1px dashed #000; padding-bottom: 8px; margin-bottom: 8px;">
        <div style="font-weight: bold; font-size: 14px;">${data.companyName || "EVANGELIST FUNERAL SERVICES"}</div>
        <div style="font-size: 10px; margin-top: 2px;">Pre-Need Deathcare Plan</div>
      </div>

      <div style="text-align: center; margin-bottom: 8px;">
        <div style="font-weight: bold; font-size: 13px;">OFFICIAL RECEIPT</div>
        <div style="font-size: 11px; font-weight: bold;">${data.receiptNumber}</div>
      </div>

      <div style="margin-bottom: 8px;">
        <div>Date: ${dateStr} ${timeStr}</div>
        <div>Received from: ${data.issuedTo}</div>
        <div>Plan Type: ${data.planType}</div>
        <div>Contract #: ${data.contractNumber}</div>
      </div>

      <div style="text-align: center; margin: 10px 0; padding: 8px; border-top: 1px dashed #000; border-bottom: 1px dashed #000;">
        <div style="font-size: 10px;">AMOUNT RECEIVED</div>
        <div style="font-size: 16px; font-weight: bold; letter-spacing: 1px;">${amount}</div>
      </div>

      <div style="margin-bottom: 8px;">
        <div>Payment Via: ${data.paymentChannel.replace("_", " ").toUpperCase()}</div>
      </div>

      <div style="text-align: center; margin-top: 12px; border-top: 1px dashed #000; padding-top: 8px;">
        <div style="font-size: 10px;">This is a computer-generated receipt.</div>
        <div style="font-size: 10px;">No signature required.</div>
        <div style="font-size: 9px; margin-top: 4px;">Served by: ${data.issuedByName}</div>
      </div>
    </div>
  `;
}

export function printThermalReceipt(data: ThermalReceiptData) {
  const html = ThermalReceiptHTML(data);

  const printWindow = window.open("", "_blank", "width=320,height=600");
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Receipt ${data.receiptNumber}</title>
      <style>
        @media print {
          @page { size: 80mm auto; margin: 2mm; }
          body { margin: 0; padding: 0; }
        }
        body { font-family: 'Courier New', monospace; }
      </style>
    </head>
    <body>
      ${html}
      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
}
