import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Download,
  Trash2,
} from "lucide-react";
import { useState, useRef, useCallback } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";

/**
 * Raw row from the user's CSV/XLSX.
 * Columns: no. / planholder name / Lpa no. / plan type / effectivity date / amount / Contact number / address
 */
interface UploadRow {
  no: string;
  planholderName: string;
  lpaNo: string;
  planType: string;
  effectivityDate: string;
  amount: string;
  contactNumber: string;
  address: string;
}

interface ValidationResult {
  row: number;
  errors: string[];
}

/**
 * Flexible column name mapping so users can use various formats.
 */
const COLUMN_ALIASES: Record<string, string> = {
  no: "no",
  "no.": "no",
  number: "no",
  "#": "no",
  "planholder name": "planholderName",
  planholder_name: "planholderName",
  planholdername: "planholderName",
  name: "planholderName",
  "client name": "planholderName",
  client_name: "planholderName",
  "lpa no.": "lpaNo",
  "lpa no": "lpaNo",
  lpa_no: "lpaNo",
  lpano: "lpaNo",
  lpa: "lpaNo",
  "contract number": "lpaNo",
  contract_number: "lpaNo",
  "plan type": "planType",
  plan_type: "planType",
  plantype: "planType",
  plan: "planType",
  "effectivity date": "effectivityDate",
  effectivity_date: "effectivityDate",
  effectivitydate: "effectivityDate",
  "start date": "effectivityDate",
  start_date: "effectivityDate",
  effectivity: "effectivityDate",
  amount: "amount",
  "plan amount": "amount",
  plan_amount: "amount",
  planamount: "amount",
  total: "amount",
  "contact number": "contactNumber",
  contact_number: "contactNumber",
  contactnumber: "contactNumber",
  phone: "contactNumber",
  "phone number": "contactNumber",
  mobile: "contactNumber",
  address: "address",
  "complete address": "address",
  "full address": "address",
};

function normalizeColumnName(name: string): string {
  const cleaned = name.trim().toLowerCase().replace(/[\s-]+/g, " ");
  return COLUMN_ALIASES[cleaned] || cleaned.replace(/[\s.]+/g, "");
}

function validateRow(row: UploadRow, rowNum: number): ValidationResult {
  const errors: string[] = [];

  if (!row.planholderName?.trim()) errors.push("Planholder name is required");
  if (!row.lpaNo?.trim()) errors.push("LPA No. is required");
  if (!row.planType?.trim()) errors.push("Plan type is required");

  if (!row.effectivityDate?.trim()) {
    errors.push("Effectivity date is required");
  } else {
    const date = new Date(row.effectivityDate);
    if (isNaN(date.getTime())) {
      errors.push(`Invalid effectivity date: ${row.effectivityDate}`);
    }
  }

  const amount = parseFloat(String(row.amount));
  if (isNaN(amount) || amount <= 0) {
    errors.push(`Invalid amount: ${row.amount}`);
  }

  if (!row.contactNumber?.trim()) errors.push("Contact number is required");
  if (!row.address?.trim()) errors.push("Address is required");

  return { row: rowNum, errors };
}

/**
 * Convert UploadRow to the ClientRow format expected by the backend.
 */
function toClientRow(row: UploadRow) {
  // Split planholder name into first/last
  const nameParts = row.planholderName.trim().split(/\s+/);
  const firstName = nameParts[0] || "Unknown";
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : firstName;

  return {
    firstName,
    lastName,
    middleName: undefined as string | undefined,
    dateOfBirth: row.effectivityDate, // Use effectivity date as placeholder
    gender: "other" as const,
    contactNumber: row.contactNumber,
    email: undefined as string | undefined,
    address: row.address,
    city: "",
    province: "",
    zipCode: "",
    occupation: undefined as string | undefined,
    beneficiaryName: "TBD",
    beneficiaryRelationship: "TBD",
    beneficiaryContact: undefined as string | undefined,
    notes: `LPA No: ${row.lpaNo} | Plan: ${row.planType} | Amount: ₱${row.amount}`,
  };
}

export default function BulkUpload() {
  const bulkCreateClients = useMutation(api.bulk.bulkCreateClients);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<UploadRow[]>([]);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    success: number;
    failed: number;
    errors: Array<{ row: number; error: string }>;
  } | null>(null);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (!selectedFile) return;

      setFile(selectedFile);
      setParsedData([]);
      setValidationResults([]);
      setUploadResult(null);
      setIsParsing(true);

      try {
        let data: UploadRow[] = [];

        if (selectedFile.name.endsWith(".csv")) {
          const text = await selectedFile.text();
          const result = Papa.parse<Record<string, string>>(text, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (header: string) => normalizeColumnName(header),
          });

          data = result.data.map((row) => ({
            no: row.no || "",
            planholderName: row.planholderName || "",
            lpaNo: row.lpaNo || "",
            planType: row.planType || "",
            effectivityDate: row.effectivityDate || "",
            amount: String(row.amount || ""),
            contactNumber: row.contactNumber || "",
            address: row.address || "",
          }));
        } else if (
          selectedFile.name.endsWith(".xlsx") ||
          selectedFile.name.endsWith(".xls")
        ) {
          const buffer = await selectedFile.arrayBuffer();
          const workbook = XLSX.read(buffer, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];

          const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(
            worksheet,
            { defval: "" },
          );

          data = jsonData.map((row) => {
            const normalizedRow: Record<string, string> = {};
            Object.entries(row).forEach(([key, value]) => {
              normalizedRow[normalizeColumnName(key)] = String(value);
            });

            return {
              no: normalizedRow.no || "",
              planholderName: normalizedRow.planholderName || "",
              lpaNo: normalizedRow.lpaNo || "",
              planType: normalizedRow.planType || "",
              effectivityDate: normalizedRow.effectivityDate || "",
              amount: normalizedRow.amount || "",
              contactNumber: normalizedRow.contactNumber || "",
              address: normalizedRow.address || "",
            };
          });
        }

        const results = data.map((row, i) => validateRow(row, i + 1));
        setParsedData(data);
        setValidationResults(results);
      } catch (error) {
        console.error("Failed to parse file:", error);
      } finally {
        setIsParsing(false);
      }
    },
    [],
  );

  const handleUpload = async () => {
    const validRows = parsedData
      .filter((_, i) => {
        const result = validationResults[i];
        return result && result.errors.length === 0;
      })
      .map((row) => toClientRow(row));

    if (validRows.length === 0) return;

    setIsUploading(true);
    setUploadResult(null);

    try {
      const result = await bulkCreateClients({ clients: validRows });
      setUploadResult(result);
    } catch (error) {
      console.error("Bulk upload failed:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setParsedData([]);
    setValidationResults([]);
    setUploadResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const validCount = validationResults.filter((r) => r.errors.length === 0).length;
  const errorCount = validationResults.filter((r) => r.errors.length > 0).length;

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Bulk Upload</h1>
        <p className="text-xs text-muted-foreground font-mono">
          &gt; import.planholders.csv — Import multiple planholders at once
        </p>
      </div>

      {/* Instructions */}
      <Card className="border-border/60 shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            Format Requirements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Upload a CSV or XLSX file with the following columns. Column names are
            case-insensitive and support various formats.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium mb-2 text-terminal-green">
                Required Columns
              </p>
              <ul className="text-xs text-muted-foreground space-y-1 font-mono">
                <li>• no. — Row number</li>
                <li>• planholder name — Full name</li>
                <li>• Lpa no. — Contract/LPA number</li>
                <li>• plan type — Plan type</li>
                <li>• effectivity date — Start date</li>
                <li>• amount — Plan amount (₱)</li>
                <li>• Contact number — Phone number</li>
                <li>• address — Complete address</li>
              </ul>
            </div>

            <div>
              <p className="text-xs font-medium mb-2 text-muted-foreground">
                Example
              </p>
              <div className="bg-muted/50 rounded-md p-3 font-mono text-[10px] text-muted-foreground space-y-1">
                <div className="text-terminal-green">
                  no., planholder name, Lpa no., plan type, effectivity date,
                  amount, Contact number, address
                </div>
                <div>
                  1, Juan Dela Cruz, LPA-2024-001, Memorial Plan, 01/15/2024,
                  50000, 09171234567, 123 Rizal Ave Manila
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                Date format: MM/DD/YYYY or YYYY-MM-DD
              </p>
            </div>
          </div>

          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 font-mono"
              onClick={() => {
                const headers = [
                  "no.",
                  "planholder name",
                  "Lpa no.",
                  "plan type",
                  "effectivity date",
                  "amount",
                  "Contact number",
                  "address",
                ];
                const sampleRow = [
                  "1",
                  "Juan Dela Cruz",
                  "LPA-2024-001",
                  "Memorial Plan",
                  "01/15/2024",
                  "50000",
                  "09171234567",
                  "123 Rizal Avenue, Manila, Metro Manila",
                ];
                const csv = [headers.join(","), sampleRow.join(",")].join("\n");
                const blob = new Blob([csv], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "sample_planholders_upload.csv";
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              <Download className="h-4 w-4" />
              Download Sample CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Upload Area */}
      <Card className="border-border/60 shadow-none">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Select File (CSV or XLSX)</Label>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileSelect}
                className="font-mono text-sm mt-1"
                disabled={isParsing}
              />
            </div>

            {isParsing && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="h-4 w-4 border-2 border-terminal-green border-t-transparent rounded-full animate-spin" />
                Parsing file...
              </div>
            )}

            {file && !isParsing && (
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-md">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB • {parsedData.length} rows
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Preview & Validation */}
      {parsedData.length > 0 && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <Badge
              variant="outline"
              className="text-xs font-mono terminal-status-current"
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              {validCount} valid
            </Badge>
            {errorCount > 0 && (
              <Badge
                variant="outline"
                className="text-xs font-mono terminal-status-claim"
              >
                <XCircle className="h-3 w-3 mr-1" />
                {errorCount} errors
              </Badge>
            )}
            <Button
              onClick={handleUpload}
              disabled={validCount === 0 || isUploading}
              className="gap-2"
            >
              {isUploading ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload {validCount} Planholder{validCount !== 1 ? "s" : ""}
                </>
              )}
            </Button>
          </div>

          <Card className="border-border/60 shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Preview ({parsedData.length} rows)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                      No.
                    </th>
                    <th className="text-left py-2 px-3 text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                      Status
                    </th>
                    <th className="text-left py-2 px-3 text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                      Planholder
                    </th>
                    <th className="text-left py-2 px-3 text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                      LPA No.
                    </th>
                    <th className="text-left py-2 px-3 text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                      Plan Type
                    </th>
                    <th className="text-left py-2 px-3 text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                      Effectivity
                    </th>
                    <th className="text-right py-2 px-3 text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                      Amount
                    </th>
                    <th className="text-left py-2 px-3 text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                      Contact
                    </th>
                    <th className="text-left py-2 px-3 text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                      Address
                    </th>
                    <th className="text-left py-2 px-3 text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                      Errors
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {parsedData.slice(0, 100).map((row, i) => {
                    const result = validationResults[i];
                    const hasErrors = result && result.errors.length > 0;
                    return (
                      <tr
                        key={i}
                        className={`border-b border-border/30 last:border-0 ${hasErrors ? "bg-red-50" : ""}`}
                      >
                        <td className="py-2 px-3 font-mono text-xs text-muted-foreground">
                          {row.no || i + 1}
                        </td>
                        <td className="py-2 px-3">
                          {hasErrors ? (
                            <XCircle className="h-4 w-4 text-red-500" />
                          ) : (
                            <CheckCircle className="h-4 w-4 text-terminal-green" />
                          )}
                        </td>
                        <td className="py-2 px-3 text-xs">
                          {row.planholderName}
                        </td>
                        <td className="py-2 px-3 font-mono text-xs">
                          {row.lpaNo}
                        </td>
                        <td className="py-2 px-3 text-xs">{row.planType}</td>
                        <td className="py-2 px-3 font-mono text-xs">
                          {row.effectivityDate}
                        </td>
                        <td className="py-2 px-3 font-mono text-xs text-right">
                          {row.amount
                            ? `₱${Number(row.amount).toLocaleString()}`
                            : "—"}
                        </td>
                        <td className="py-2 px-3 font-mono text-xs">
                          {row.contactNumber}
                        </td>
                        <td className="py-2 px-3 text-xs max-w-[200px] truncate">
                          {row.address}
                        </td>
                        <td className="py-2 px-3">
                          {hasErrors && (
                            <div className="text-[10px] text-red-600">
                              {result.errors.map((e, j) => (
                                <div key={j}>• {e}</div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {parsedData.length > 100 && (
                <div className="p-3 text-center text-xs text-muted-foreground border-t border-border">
                  Showing 100 of {parsedData.length} rows
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Upload Result */}
      {uploadResult && (
        <Card className="border-border/60 shadow-none">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {uploadResult.failed === 0 ? (
                  <CheckCircle className="h-8 w-8 text-terminal-green" />
                ) : (
                  <AlertTriangle className="h-8 w-8 text-terminal-amber" />
                )}
                <div>
                  <h3 className="text-lg font-bold">Upload Complete</h3>
                  <p className="text-sm text-muted-foreground">
                    {uploadResult.success} planholder
                    {uploadResult.success !== 1 ? "s" : ""} created
                    {uploadResult.failed > 0 &&
                      `, ${uploadResult.failed} failed`}
                  </p>
                </div>
              </div>

              {uploadResult.errors.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-red-600">Errors:</p>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {uploadResult.errors.map((err, i) => (
                      <div key={i} className="text-xs text-red-600 font-mono">
                        Row {err.row}: {err.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button variant="outline" onClick={handleReset}>
                Upload Another File
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
