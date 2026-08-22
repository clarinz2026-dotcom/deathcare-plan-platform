import { format } from "date-fns";

export interface SOAData {
  clientName: string;
  clientAddress: string;
  clientContact: string;
  clientEmail?: string;
  beneficiaryName: string;
  beneficiaryRelationship: string;
  contracts: Array<{
    contractNumber: string;
    planType: string;
    planAmount: number;
    monthlyAmortization: number;
    totalPaid: number;
    contractStatus: string;
    startDate: number;
  }>;
  payments: Array<{
    paymentDate: number;
    amount: number;
    paymentChannel: string;
    orNumber?: string;
    contractNumber: string;
    remarks?: string;
  }>;
  generatedDate: string;
  accountNumber: string;
}

function formatPHP(amount: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function generateSOAHTML(data: SOAData): string {
  const totalPlanAmount = data.contracts.reduce((sum, c) => sum + c.planAmount, 0);
  const totalPaid = data.contracts.reduce((sum, c) => sum + c.totalPaid, 0);
  const totalBalance = totalPlanAmount - totalPaid;

  const paymentsByContract: Record<string, typeof data.payments> = {};
  for (const payment of data.payments) {
    const key = payment.contractNumber;
    if (!paymentsByContract[key]) paymentsByContract[key] = [];
    paymentsByContract[key].push(payment);
  }

  const contractsHTML = data.contracts
    .map((c) => {
      const balance = c.planAmount - c.totalPaid;
      const progress = c.planAmount ? (c.totalPaid / c.planAmount) * 100 : 0;
      const contractPayments = paymentsByContract[c.contractNumber] || [];

      const paymentsRows = contractPayments
        .map(
          (p) => `
        <tr>
          <td style="padding: 6px 8px; border-bottom: 1px solid #e5e5e0; font-size: 11px; font-family: 'Courier New', monospace;">
            ${format(new Date(p.paymentDate), "MMM d, yyyy")}
          </td>
          <td style="padding: 6px 8px; border-bottom: 1px solid #e5e5e0; font-size: 11px; font-family: 'Courier New', monospace;">
            ${p.orNumber || "—"}
          </td>
          <td style="padding: 6px 8px; border-bottom: 1px solid #e5e5e0; font-size: 11px;">
            ${p.paymentChannel.toUpperCase().replace(/_/g, " ")}
          </td>
          <td style="padding: 6px 8px; border-bottom: 1px solid #e5e5e0; font-size: 11px; text-align: right; font-family: 'Courier New', monospace; font-weight: bold;">
            ${formatPHP(p.amount)}
          </td>
        </tr>`
        )
        .join("");

      const statusLabel = c.contractStatus
        .replace(/_/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase());

      return `
      <div style="margin-bottom: 24px; page-break-inside: avoid;">
        <div style="background: #f8f7f4; border: 1px solid #e5e5e0; border-radius: 6px; padding: 12px 16px; margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
            <div>
              <span style="font-family: 'Courier New', monospace; font-size: 13px; font-weight: bold;">${c.contractNumber}</span>
              <span style="font-size: 11px; color: #6b6b60; margin-left: 12px;">${c.planType}</span>
            </div>
            <span style="font-size: 10px; padding: 2px 8px; border: 1px solid #d4d4cc; border-radius: 4px; font-family: 'Courier New', monospace; text-transform: uppercase;">
              ${statusLabel}
            </span>
          </div>
          <div style="display: flex; gap: 24px; margin-top: 8px; font-size: 11px; color: #6b6b60;">
            <span>Start: ${format(new Date(c.startDate), "MMM d, yyyy")}</span>
            <span>Monthly: ${formatPHP(c.monthlyAmortization)}</span>
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 8px;">
          <thead>
            <tr style="border-bottom: 2px solid #2d8a4e;">
              <th style="padding: 6px 8px; text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b6b60; font-family: 'Courier New', monospace;">Date</th>
              <th style="padding: 6px 8px; text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b6b60; font-family: 'Courier New', monospace;">OR #</th>
              <th style="padding: 6px 8px; text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b6b60; font-family: 'Courier New', monospace;">Channel</th>
              <th style="padding: 6px 8px; text-align: right; font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b6b60; font-family: 'Courier New', monospace;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${paymentsRows || `<tr><td colspan="4" style="padding: 12px 8px; text-align: center; font-size: 11px; color: #999; font-style: italic;">No payments recorded</td></tr>`}
          </tbody>
          <tfoot>
            <tr style="border-top: 2px solid #2d8a4e;">
              <td colspan="3" style="padding: 8px 8px; font-size: 11px; font-weight: bold; font-family: 'Courier New', monospace;">Total Paid:</td>
              <td style="padding: 8px 8px; text-align: right; font-size: 12px; font-weight: bold; color: #2d8a4e; font-family: 'Courier New', monospace;">${formatPHP(c.totalPaid)}</td>
            </tr>
          </tfoot>
        </table>

        <div style="display: flex; justify-content: flex-end; gap: 16px; font-size: 11px; font-family: 'Courier New', monospace;">
          <span>Plan Amount: <strong>${formatPHP(c.planAmount)}</strong></span>
          <span>Balance: <strong style="color: ${balance > 0 ? "#d4a017" : "#2d8a4e"};">${formatPHP(balance)}</strong></span>
        </div>
      </div>`;
    })
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    @page {
      size: A4;
      margin: 20mm;
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #2d2d2a;
      background: #ffffff;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div id="soa-content" style="max-width: 700px; margin: 0 auto; padding: 24px;">
    <!-- Header -->
    <div style="border-bottom: 3px solid #2d8a4e; padding-bottom: 16px; margin-bottom: 24px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px;">
        <div>
          <h1 style="font-size: 20px; font-weight: bold; letter-spacing: -0.02em; color: #1a1a18;">
            STATEMENT OF ACCOUNT
          </h1>
          <p style="font-family: 'Courier New', monospace; font-size: 11px; color: #6b6b60; margin-top: 4px;">
            > stpeter.lifeplan — account.statement
          </p>
        </div>
        <div style="text-align: right;">
          <p style="font-size: 10px; color: #6b6b60; text-transform: uppercase; letter-spacing: 0.05em;">Generated</p>
          <p style="font-family: 'Courier New', monospace; font-size: 12px; font-weight: bold;">${data.generatedDate}</p>
          <p style="font-family: 'Courier New', monospace; font-size: 10px; color: #6b6b60; margin-top: 4px;">Acct: ${data.accountNumber}</p>
        </div>
      </div>
    </div>

    <!-- Client Info -->
    <div style="background: #f8f7f4; border: 1px solid #e5e5e0; border-radius: 6px; padding: 16px; margin-bottom: 24px;">
      <p style="font-size: 9px; text-transform: uppercase; letter-spacing: 0.08em; color: #6b6b60; margin-bottom: 8px; font-family: 'Courier New', monospace;">
        Account Holder
      </p>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px;">
        <div>
          <span style="color: #6b6b60;">Name:</span>
          <strong style="margin-left: 4px;">${data.clientName}</strong>
        </div>
        <div>
          <span style="color: #6b6b60;">Contact:</span>
          <span style="margin-left: 4px; font-family: 'Courier New', monospace; font-size: 11px;">${data.clientContact}</span>
        </div>
        <div style="grid-column: 1 / -1;">
          <span style="color: #6b6b60;">Address:</span>
          <span style="margin-left: 4px;">${data.clientAddress}</span>
        </div>
        ${data.clientEmail ? `<div><span style="color: #6b6b60;">Email:</span><span style="margin-left: 4px;">${data.clientEmail}</span></div>` : ""}
        <div>
          <span style="color: #6b6b60;">Beneficiary:</span>
          <span style="margin-left: 4px;">${data.beneficiaryName} (${data.beneficiaryRelationship})</span>
        </div>
      </div>
    </div>

    <!-- Contracts & Payments -->
    <div style="margin-bottom: 24px;">
      <h2 style="font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; color: #6b6b60; margin-bottom: 16px; font-family: 'Courier New', monospace;">
        Contracts &amp; Payment History
      </h2>
      ${contractsHTML}
    </div>

    <!-- Summary -->
    <div style="border-top: 3px solid #2d8a4e; padding-top: 16px; margin-top: 16px;">
      <h2 style="font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; color: #6b6b60; margin-bottom: 12px; font-family: 'Courier New', monospace;">
        Account Summary
      </h2>
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;">
        <div style="background: #f8f7f4; border: 1px solid #e5e5e0; border-radius: 6px; padding: 12px; text-align: center;">
          <p style="font-size: 9px; text-transform: uppercase; color: #6b6b60; margin-bottom: 4px; font-family: 'Courier New', monospace;">Total Plan Amount</p>
          <p style="font-size: 16px; font-weight: bold; font-family: 'Courier New', monospace;">${formatPHP(totalPlanAmount)}</p>
        </div>
        <div style="background: #f8f7f4; border: 1px solid #e5e5e0; border-radius: 6px; padding: 12px; text-align: center;">
          <p style="font-size: 9px; text-transform: uppercase; color: #6b6b60; margin-bottom: 4px; font-family: 'Courier New', monospace;">Total Paid</p>
          <p style="font-size: 16px; font-weight: bold; font-family: 'Courier New', monospace; color: #2d8a4e;">${formatPHP(totalPaid)}</p>
        </div>
        <div style="background: #f8f7f4; border: 1px solid #e5e5e0; border-radius: 6px; padding: 12px; text-align: center;">
          <p style="font-size: 9px; text-transform: uppercase; color: #6b6b60; margin-bottom: 4px; font-family: 'Courier New', monospace;">Outstanding Balance</p>
          <p style="font-size: 16px; font-weight: bold; font-family: 'Courier New', monospace; color: ${totalBalance > 0 ? "#d4a017" : "#2d8a4e"};">${formatPHP(totalBalance)}</p>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div style="margin-top: 32px; padding-top: 12px; border-top: 1px solid #e5e5e0; font-size: 9px; color: #999; text-align: center; font-family: 'Courier New', monospace;">
      <p>This Statement of Account is computer-generated and does not require a signature.</p>
      <p style="margin-top: 4px;">St. Peter Life Plan — Pre-Need Deathcare Plan Management</p>
      <p style="margin-top: 4px; color: #ccc;">Generated on ${data.generatedDate}</p>
    </div>
  </div>
</body>
</html>`;
}
