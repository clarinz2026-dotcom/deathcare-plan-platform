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

interface ClientRow {
  firstName: string;
  lastName: string;
  middleName?: string;
  dateOfBirth: string;
  gender: "male" | "female" | "other";
  contactNumber: string;
  email?: string;
  address: string;
  city: string;
  province: string;
  zipCode: string;
  occupation?: string;
  beneficiaryName: string;
  beneficiaryRelationship: string;
  beneficiaryContact?: string;
  notes?: string;
}

interface ValidationResult {
  row: number;
  errors: string[];
}

const REQUIRED_COLUMNS = [
  "firstName",
  "lastName",
  "dateOfBirth",
  "gender",
  "contactNumber",
  "address",
  "city",
  "province",
  "zipCode",
  "beneficiaryName",
  "beneficiaryRelationship",
];

const COLUMN_ALIASES: Record<string, string> = {
  firstname: "firstName",
  first_name: "firstName",
  first: "firstName",
  lastname: "lastName",
  last_name: "lastName",
  last: "lastName",
  middlename: "middleName",
  middle_name: "middleName",
  middle: "middleName",
  dateofbirth: "dateOfBirth",
  date_of_birth: "dateOfBirth",
  dob: "dateOfBirth",
  birthdate: "dateOfBirth",
  birth_date: "dateOfBirth",
  gender: "gender",
  sex: "gender",
  contactnumber: "contactNumber",
  contact_number: "contactNumber",
  phone: "contactNumber",
  phone_number: "contactNumber",
  mobile: "contactNumber",
  email: "email",
  address: "address",
  street: "address",
  city: "city",
  province: "province",
  state: "province",
  zipcode: "zipCode",
  zip_code: "zipCode",
  postal: "zipCode",
  occupation: "occupation",
  job: "occupation",
  beneficiaryname: "beneficiaryName",
  beneficiary_name: "beneficiaryName",
  beneficiary: "beneficiaryName",
  beneficiaryrelationship: "beneficiaryRelationship",
  beneficiary_relationship: "beneficiaryRelationship",
  relationship: "beneficiaryRelationship",
  beneficiarycontact: "beneficiaryContact",
  beneficiary_contact: "beneficiaryContact",
  notes: "notes",
  remarks: "notes",
  comments: "notes",
};

function normalizeColumnName(name: string): string {
  const cleaned = name.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return COLUMN_ALIASES[cleaned] || cleaned;
}

function validateRow(row: ClientRow, rowNum: number): ValidationResult {
  const errors: string[] = [];

  if (!row.firstName?.trim()) errors.push("First name is required");
  if (!row.lastName?.trim()) errors.push("Last name is required");
  if (!row.dateOfBirth?.trim()) {
    errors.push("Date of birth is required");
  } else {
    const dob = new Date(row.dateOfBirth);
    if (isNaN(dob.getTime())) {
      errors.push(`Invalid date of birth: ${row.dateOfBirth}`);
    } else if (dob > new Date()) {
      errors.push("Date of birth cannot be in the future");
    }
  }

  const gender = row.gender?.toLowerCase().trim();
  if (!gender) {
    errors.push("Gender is required");
  } else if (!["male", "female", "other"].includes(gender)) {
    errors.push(`Invalid gender: ${row.gender}. Must be male, female, or other`);
  }

  if (!row.contactNumber?.trim()) errors.push("Contact number is required");
  if (!row.address?.trim()) errors.push("Address is required");
  if (!row.city?.trim()) errors.push("City is required");
  if (!row.province?.trim()) errors.push("Province is required");
  if (!row.zipCode?.trim()) errors.push("Zip code is required");
  if (!row.beneficiaryName?.trim()) errors.push("Beneficiary name is required");
  if (!row.beneficiaryRelationship?.trim())
    errors.push("Beneficiary relationship is required");

  return { row: rowNum, errors };
}

export default function BulkUpload() {
  const bulkCreateClients = useMutation(api.bulk.bulkCreateClients);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ClientRow[]>([]);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    success: number;
    failed: number;
    errors: Array<{ row: number; error: string }>;
  } | null>(null);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setParsedData([]);
    setValidationResults([]);
    setUploadResult(null);
    setIsParsing(true);

    try {
      let data: ClientRow[] = [];

      if (selectedFile.name.endsWith(".csv")) {
        // Parse CSV
        const text = await selectedFile.text();
        const result = Papa.parse<Record<string, string>>(text, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header: string) => normalizeColumnName(header),
        });

        data = result.data.map((row) => ({
          firstName: row.firstName || "",
          lastName: row.lastName || "",
          middleName: row.middleName || undefined,
          dateOfBirth: row.dateOfBirth || "",
          gender: (row.gender?.toLowerCase().trim() || "other") as "male" | "female" | "other",
          contactNumber: row.contactNumber || "",
          email: row.email || undefined,
          address: row.address || "",
          city: row.city || "",
          province: row.province || "",
          zipCode: row.zipCode || "",
          occupation: row.occupation || undefined,
          beneficiaryName: row.beneficiaryName || "",
          beneficiaryRelationship: row.beneficiaryRelationship || "",
          beneficiaryContact: row.beneficiaryContact || undefined,
          notes: row.notes || undefined,
        }));
      } else if (
        selectedFile.name.endsWith(".xlsx") ||
        selectedFile.name.endsWith(".xls")
      ) {
        // Parse Excel
        const buffer = await selectedFile.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet, {
          defval: "",
        });

        data = jsonData.map((row) => {
          const normalizedRow: Record<string, string> = {};
          Object.entries(row).forEach(([key, value]) => {
            normalizedRow[normalizeColumnName(key)] = String(value);
          });

          return {
            firstName: normalizedRow.firstName || "",
            lastName: normalizedRow.lastName || "",
            middleName: normalizedRow.middleName || undefined,
            dateOfBirth: normalizedRow.dateOfBirth || "",
            gender: (normalizedRow.gender?.toLowerCase().trim() || "other") as "male" | "female" | "other",
            contactNumber: normalizedRow.contactNumber || "",
            email: normalizedRow.email || undefined,
            address: normalizedRow.address || "",
            city: normalizedRow.city || "",
            province: normalizedRow.province || "",
            zipCode: normalizedRow.zipCode || "",
            occupation: normalizedRow.occupation || undefined,
            beneficiaryName: normalizedRow.beneficiaryName || "",
            beneficiaryRelationship: normalizedRow.beneficiaryRelationship || "",
            beneficiaryContact: normalizedRow.beneficiaryContact || undefined,
            notes: normalizedRow.notes || undefined,
          };
        });
      }

      // Validate data
      const results = data.map((row, i) => validateRow(row, i + 1));
      setParsedData(data);
      setValidationResults(results);
    } catch (error) {
      console.error("Failed to parse file:", error);
    } finally {
      setIsParsing(false);
    }
  }, []);

  const handleUpload = async () => {
    // Filter out rows with errors
    const validRows = parsedData.filter((_, i) => {
      const result = validationResults[i];
      return result && result.errors.length === 0;
    });

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
        <h1 className="text-2xl font-bold tracking-tight">Bulk Upload Clients</h1>
        <p className="text-xs text-muted-foreground font-mono">
          &gt; import.clients.csv — Import multiple clients at once
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
            case-insensitive and support various formats (e.g., "First Name",
            "firstName", "first_name").
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium mb-2 text-terminal-green">
                Required Columns
              </p>
              <ul className="text-xs text-muted-foreground space-y-1 font-mono">
                <li>• firstName / First Name</li>
                <li>• lastName / Last Name</li>
                <li>• dateOfBirth / Date of Birth</li>
                <li>• gender / Sex (male/female/other)</li>
                <li>• contactNumber / Phone</li>
                <li>• address / Street</li>
                <li>• city</li>
                <li>• province / State</li>
                <li>• zipCode / Postal Code</li>
                <li>• beneficiaryName</li>
                <li>• beneficiaryRelationship</li>
              </ul>
            </div>

            <div>
              <p className="text-xs font-medium mb-2 text-muted-foreground">
                Optional Columns
              </p>
              <ul className="text-xs text-muted-foreground space-y-1 font-mono">
                <li>• middleName / Middle Name</li>
                <li>• email</li>
                <li>• occupation / Job</li>
                <li>• beneficiaryContact</li>
                <li>• notes / Remarks</li>
              </ul>
            </div>
          </div>

          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 font-mono"
              onClick={() => {
                // Generate sample CSV
                const headers = [
                  "firstName",
                  "lastName",
                  "middleName",
                  "dateOfBirth",
                  "gender",
                  "contactNumber",
                  "email",
                  "address",
                  "city",
                  "province",
                  "zipCode",
                  "occupation",
                  "beneficiaryName",
                  "beneficiaryRelationship",
                  "beneficiaryContact",
                  "notes",
                ];
                const sampleRow = [
                  "Juan",
                  "Dela Cruz",
                  "Santos",
                  "1985-03-15",
                  "male",
                  "09171234567",
                  "juan@email.com",
                  "123 Rizal Avenue",
                  "Manila",
                  "Metro Manila",
                  "1000",
                  "Engineer",
                  "Maria Dela Cruz",
                  "Wife",
                  "09187654321",
                  "VIP client",
                ];
                const csv = [headers.join(","), sampleRow.join(",")].join("\n");
                const blob = new Blob([csv], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "sample_clients_upload.csv";
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
          {/* Summary */}
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="text-xs font-mono terminal-status-current">
              <CheckCircle className="h-3 w-3 mr-1" />
              {validCount} valid
            </Badge>
            {errorCount > 0 && (
              <Badge variant="outline" className="text-xs font-mono terminal-status-claim">
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
                  Upload {validCount} Client{validCount !== 1 ? "s" : ""}
                </>
              )}
            </Button>
          </div>

          {/* Preview Table */}
          <Card className="border-border/60 shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Preview ({parsedData.length} rows)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm min-w-[800px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                      Row
                    </th>
                    <th className="text-left py-2 px-3 text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                      Status
                    </th>
                    <th className="text-left py-2 px-3 text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                      Name
                    </th>
                    <th className="text-left py-2 px-3 text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                      DOB
                    </th>
                    <th className="text-left py-2 px-3 text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                      Gender
                    </th>
                    <th className="text-left py-2 px-3 text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                      Contact
                    </th>
                    <th className="text-left py-2 px-3 text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                      City
                    </th>
                    <th className="text-left py-2 px-3 text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                      Beneficiary
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
                        className={`border-b border-border/30 last:border-0 ${
                          hasErrors ? "bg-red-50" : ""
                        }`}
                      >
                        <td className="py-2 px-3 font-mono text-xs text-muted-foreground">
                          {i + 1}
                        </td>
                        <td className="py-2 px-3">
                          {hasErrors ? (
                            <XCircle className="h-4 w-4 text-red-500" />
                          ) : (
                            <CheckCircle className="h-4 w-4 text-terminal-green" />
                          )}
                        </td>
                        <td className="py-2 px-3 text-xs">
                          {row.lastName}, {row.firstName}
                          {row.middleName ? ` ${row.middleName}` : ""}
                        </td>
                        <td className="py-2 px-3 font-mono text-xs">
                          {row.dateOfBirth}
                        </td>
                        <td className="py-2 px-3 text-xs capitalize">
                          {row.gender}
                        </td>
                        <td className="py-2 px-3 font-mono text-xs">
                          {row.contactNumber}
                        </td>
                        <td className="py-2 px-3 text-xs">{row.city}</td>
                        <td className="py-2 px-3 text-xs">{row.beneficiaryName}</td>
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
                    {uploadResult.success} client{uploadResult.success !== 1 ? "s" : ""} created
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
