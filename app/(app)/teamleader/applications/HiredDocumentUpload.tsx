"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Upload, Trash2, FileText, Image, File, CheckCircle, Loader2 } from "lucide-react";

const BUCKET = "hired_agents";

// Document types for hired agents
const DOCUMENT_TYPES = [
  { key: "passport", label: "Passport", icon: FileText },
  { key: "cv", label: "CV", icon: FileText },
  { key: "selfie", label: "Selfie", icon: Image },
  { key: "service_agreement", label: "Service Agreement", icon: File },
] as const;

type DocumentType = (typeof DOCUMENT_TYPES)[number]["key"];

// Accepted file types
const ACCEPTED_TYPES: Record<string, string[]> = {
  passport: ["application/pdf", "image/jpeg", "image/jpg", "image/png"],
  cv: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  selfie: ["image/jpeg", "image/jpg", "image/png"],
  service_agreement: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
};

// Accept attribute for file inputs
const ACCEPT_STRINGS: Record<string, string> = {
  passport: ".pdf,.jpg,.jpeg,.png",
  cv: ".pdf,.doc,.docx",
  selfie: ".jpg,.jpeg,.png",
  service_agreement: ".pdf,.doc,.docx",
};

interface UploadedDocument {
  type: DocumentType;
  fileName: string;
  storagePath: string;
  publicUrl: string;
  uploadedAt: string;
}

interface HiredDocumentUploadProps {
  applicantName: string;
  isHired: boolean;
}

export default function HiredDocumentUpload({
  applicantName,
  isHired,
}: HiredDocumentUploadProps) {
  const { toast } = useToast();
  const supabase = createClient();
  const [documents, setDocuments] = useState<Record<DocumentType, UploadedDocument | null>>({
    passport: null,
    cv: null,
    selfie: null,
    service_agreement: null,
  });
  const [uploading, setUploading] = useState<Record<DocumentType, boolean>>({
    passport: false,
    cv: false,
    selfie: false,
    service_agreement: false,
  });
  const [loading, setLoading] = useState(true);

  // Sanitize applicant name for folder path
  const sanitizeName = (name: string) => {
    return name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "_");
  };

  // Get folder path for applicant
  const getFolderPath = useCallback(() => {
    if (!applicantName) return "";
    return sanitizeName(applicantName);
  }, [applicantName]);

  // Fetch existing documents
  const fetchDocuments = useCallback(async () => {
    if (!applicantName || !isHired) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const folderPath = getFolderPath();

    try {
      const newDocs: Record<DocumentType, UploadedDocument | null> = {
        passport: null,
        cv: null,
        selfie: null,
        service_agreement: null,
      };

      for (const docType of DOCUMENT_TYPES) {
        const docPath = `${folderPath}/${docType.key}`;
        const { data, error } = await supabase.storage.from(BUCKET).list(docPath, {
          limit: 1,
          sortBy: { column: "created_at", order: "desc" },
        });

        if (!error && data && data.length > 0) {
          const file = data[0];
          const fullPath = `${docPath}/${file.name}`;
          const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(fullPath);

          newDocs[docType.key] = {
            type: docType.key,
            fileName: file.name,
            storagePath: fullPath,
            publicUrl: urlData.publicUrl,
            uploadedAt: file.created_at || new Date().toISOString(),
          };
        }
      }

      setDocuments(newDocs);
    } catch (err) {
      console.error("Error fetching documents:", err);
    } finally {
      setLoading(false);
    }
  }, [applicantName, isHired, supabase, getFolderPath]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Handle file upload
  const handleUpload = async (docType: DocumentType, file: File) => {
    if (!applicantName) {
      toast({
        title: "Error",
        description: "Please enter applicant name first",
        variant: "destructive",
      });
      return;
    }

    // Validate file type
    const allowedTypes = ACCEPTED_TYPES[docType];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: `Accepted formats: ${ACCEPT_STRINGS[docType]}`,
        variant: "destructive",
      });
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Maximum file size is 10MB",
        variant: "destructive",
      });
      return;
    }

    setUploading((prev) => ({ ...prev, [docType]: true }));

    try {
      const folderPath = getFolderPath();
      const cleanName = file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
      const filePath = `${folderPath}/${docType}/${cleanName}`;

      // Delete existing file if any
      if (documents[docType]) {
        await supabase.storage.from(BUCKET).remove([documents[docType]!.storagePath]);
      }

      // Upload new file
      const { error } = await supabase.storage.from(BUCKET).upload(filePath, file, {
        upsert: true,
        contentType: file.type,
        cacheControl: "3600",
      });

      if (error) {
        throw new Error(error.message);
      }

      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filePath);

      setDocuments((prev) => ({
        ...prev,
        [docType]: {
          type: docType,
          fileName: cleanName,
          storagePath: filePath,
          publicUrl: urlData.publicUrl,
          uploadedAt: new Date().toISOString(),
        },
      }));

      toast({
        title: "Document Uploaded",
        description: `${DOCUMENT_TYPES.find((d) => d.key === docType)?.label} uploaded successfully`,
      });
    } catch (err) {
      console.error("Upload error:", err);
      toast({
        title: "Upload Failed",
        description: err instanceof Error ? err.message : "An error occurred during upload",
        variant: "destructive",
      });
    } finally {
      setUploading((prev) => ({ ...prev, [docType]: false }));
    }
  };

  // Handle file delete
  const handleDelete = async (docType: DocumentType) => {
    const doc = documents[docType];
    if (!doc) return;

    try {
      const { error } = await supabase.storage.from(BUCKET).remove([doc.storagePath]);

      if (error) {
        throw new Error(error.message);
      }

      setDocuments((prev) => ({ ...prev, [docType]: null }));

      toast({
        title: "Document Deleted",
        description: `${DOCUMENT_TYPES.find((d) => d.key === docType)?.label} deleted successfully`,
      });
    } catch (err) {
      console.error("Delete error:", err);
      toast({
        title: "Delete Failed",
        description: err instanceof Error ? err.message : "An error occurred during deletion",
        variant: "destructive",
      });
    }
  };

  // Don't render anything if not hired
  if (!isHired) return null;

  // Don't render if no applicant name
  if (!applicantName) {
    return (
      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
        <p className="text-sm text-yellow-700 dark:text-yellow-300">
          Please enter the applicant name to upload documents.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Upload className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-200">
          Required Documents
        </h3>
        <span className="text-xs text-blue-600 dark:text-blue-400 ml-auto">
          {Object.values(documents).filter(Boolean).length}/{DOCUMENT_TYPES.length} uploaded
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
          <span className="ml-2 text-sm text-blue-600">Loading documents...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {DOCUMENT_TYPES.map((docType) => {
            const doc = documents[docType.key];
            const isUploading = uploading[docType.key];
            const IconComponent = docType.icon;

            return (
              <div
                key={docType.key}
                className={`relative flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  doc
                    ? "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700"
                    : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600"
                }`}
              >
                <div
                  className={`flex-shrink-0 p-2 rounded-lg ${
                    doc
                      ? "bg-green-100 dark:bg-green-800"
                      : "bg-gray-100 dark:bg-gray-700"
                  }`}
                >
                  {doc ? (
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <IconComponent className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium ${
                      doc
                        ? "text-green-800 dark:text-green-200"
                        : "text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {docType.label}
                  </p>
                  {doc ? (
                    <p className="text-xs text-green-600 dark:text-green-400 truncate">
                      {doc.fileName}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      {ACCEPT_STRINGS[docType.key]}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {doc && (
                    <>
                      <a
                        href={doc.publicUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded transition-colors"
                        title="View document"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          />
                        </svg>
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDelete(docType.key)}
                        className="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/40 rounded transition-colors"
                        title="Delete document"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}

                  {/* Upload button */}
                  <label
                    className={`p-1.5 rounded cursor-pointer transition-colors ${
                      isUploading
                        ? "opacity-50 cursor-not-allowed"
                        : doc
                          ? "text-gray-500 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                          : "text-blue-600 hover:text-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/40"
                    }`}
                    title={doc ? "Replace document" : "Upload document"}
                  >
                    {isUploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    <input
                      type="file"
                      className="hidden"
                      accept={ACCEPT_STRINGS[docType.key]}
                      disabled={isUploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleUpload(docType.key, file);
                          e.target.value = ""; // Reset input
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
