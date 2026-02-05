"use client";

import { useState, type DragEvent, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Upload,
  FileSpreadsheet,
  XCircle,
  Download,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import { type AppDispatch } from "@/store";
import { uploadCategories } from "@/store/slices/admin/categorySlice";
import { Progress } from "@/components/ui/progress";

/* ================================
   Download CSV Template
================================ */
const downloadCategoryTemplate = () => {
  const headers = [
    "main_category",
    "categories_name",
    "subcategories_name",
    "main_category_image",
    "categories_image",
  ];

  const sampleRow = [
    "Electronics",
    "Mobiles & Accessories",
    "Smartphones",
    "https://example.com/main-category.jpg",
    "https://example.com/category.jpg",
  ];

  const csvContent =
    headers.join(",") + "\n" + sampleRow.join(",");

  const blob = new Blob([csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "category-template.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export default function UploadCategoryDialog() {
  const dispatch = useDispatch<AppDispatch>();
  const { uploadStatus } = useSelector((s: any) => s.categories);

  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [open, setOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSummary, setUploadSummary] = useState<any | null>(null);

  useEffect(() => {
    if (uploadStatus !== "loading") {
      setUploadProgress(0);
      return;
    }

    let value = 12;
    setUploadProgress(value);
    const timer = setInterval(() => {
      value = value >= 90 ? 20 : value + 8;
      setUploadProgress(value);
    }, 350);

    return () => clearInterval(timer);
  }, [uploadStatus]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      setUploadSummary(null);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files?.length > 0) {
      setFile(e.dataTransfer.files[0]);
      setUploadSummary(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a file to upload!");
      return;
    }

    const res = await dispatch(uploadCategories(file));

    if (res.meta.requestStatus === "fulfilled") {
      toast.success("Categories uploaded successfully!");
      setUploadSummary(res.payload?.summary || null);
      setFile(null);
    } else {
      toast.error("Failed to upload file. Please try again.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="space-x-1">
          <span>Upload Excel</span>
          <Upload size={18} />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Category File</DialogTitle>
          <DialogDescription>
            Upload an <strong>Excel (.xlsx)</strong> or{" "}
            <strong>CSV</strong> file with category hierarchy data.
            <br />
            Download the template to ensure correct columns.
          </DialogDescription>

          {/* Download Template */}
          <Button
            variant="secondary"
            size="sm"
            className="mt-3 w-fit"
            onClick={downloadCategoryTemplate}
          >
            <Download className="mr-2 h-4 w-4" />
            Download Template
          </Button>
        </DialogHeader>

        {/* Drag & Drop Area */}
        <motion.div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDragging(false);
          }}
          onDrop={handleDrop}
          className={`mt-4 flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${
            isDragging
              ? "border-primary bg-primary/10"
              : "border-muted bg-muted/30 hover:bg-muted/50"
          }`}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          {!file ? (
            <>
              <Upload className="w-10 h-10 text-primary mb-2" />
              <p className="text-sm text-muted-foreground">
                Drag & drop your file here or{" "}
                <label
                  htmlFor="file-upload"
                  className="text-primary font-medium cursor-pointer"
                >
                  browse
                </label>
              </p>
              <input
                type="file"
                accept=".xlsx,.csv"
                id="file-upload"
                className="hidden"
                onChange={handleFileSelect}
              />
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-3 bg-background p-3 rounded-lg shadow-sm w-full justify-between"
            >
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="text-primary" size={22} />
                <span className="text-sm font-medium truncate max-w-[180px]">
                  {file.name}
                </span>
              </div>
              <button
                onClick={() => {
                  setFile(null);
                  setUploadSummary(null);
                }}
                className="text-muted-foreground hover:text-destructive transition"
              >
                <XCircle size={20} />
              </button>
            </motion.div>
          )}
        </motion.div>

        {uploadStatus === "loading" && (
          <div className="mt-4 space-y-2">
            <div className="text-xs text-muted-foreground">Uploading file...</div>
            <Progress value={uploadProgress} />
          </div>
        )}
        {uploadSummary && uploadStatus !== "loading" && (
          <div className="mt-4 rounded-lg border border-border bg-muted/20 p-3 text-sm">
            <div className="flex items-center justify-between font-medium">
              <span>Upload Summary</span>
              <span>{uploadSummary.totalRows || 0} rows</span>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Inserted {uploadSummary.mainCategories?.inserted || 0} main categories,
              {uploadSummary.categories?.inserted || 0} categories,
              {uploadSummary.subcategories?.inserted || 0} subcategories.
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
              <div>
                <div className="font-medium text-foreground">
                  {uploadSummary.mainCategories?.inserted || 0}
                </div>
                <div>Main categories</div>
              </div>
              <div>
                <div className="font-medium text-foreground">
                  {uploadSummary.categories?.inserted || 0}
                </div>
                <div>Categories</div>
              </div>
              <div>
                <div className="font-medium text-foreground">
                  {uploadSummary.subcategories?.inserted || 0}
                </div>
                <div>Subcategories</div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span>Skipped</span>
              <span>{uploadSummary.skippedRows?.length || 0}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span>Failed</span>
              <span>{uploadSummary.failedRows?.length || 0}</span>
            </div>
            {uploadSummary.skippedRows?.length ? (
              <div className="mt-2 max-h-24 overflow-auto text-xs text-amber-600">
                {uploadSummary.skippedRows.map((row: any, idx: number) => (
                  <div key={idx}>
                    Row {row.row}: {row.reason}
                  </div>
                ))}
              </div>
            ) : null}
            {uploadSummary.failedRows?.length ? (
              <div className="mt-2 max-h-24 overflow-auto text-xs text-red-500">
                {uploadSummary.failedRows.map((row: any, idx: number) => (
                  <div key={idx}>
                    Row {row.row}: {row.reason}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )}

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={uploadStatus === "loading"}
          >
            {uploadStatus === "loading" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              "Upload"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
