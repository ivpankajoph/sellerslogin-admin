import { useState, type DragEvent } from "react";

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
import { Loader2, Upload, FileSpreadsheet, XCircle } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useDispatch } from "react-redux";
import { useSelector } from "react-redux";
import { type AppDispatch } from "@/store";
import { uploadCategories } from "@/store/slices/admin/categorySlice";

export default function UploadCategoryDialog() {
  const dispatch = useDispatch<AppDispatch>();
  const { uploadStatus } = useSelector((s:any) => s.categories);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [open, setOpen] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
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
      setOpen(false);
      setFile(null);
    } else {
      toast.error("Failed to upload file. Please try again.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="space-x-1">
          <span>Upload Excel</span> <Upload size={18} />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Category File</DialogTitle>
          <DialogDescription>
            Upload an <strong>Excel (.xlsx)</strong> or <strong>CSV</strong> file containing your category and subcategory data.
          </DialogDescription>
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
            isDragging ? "border-primary bg-primary/10" : "border-muted bg-muted/30 hover:bg-muted/50"
          }`}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          {!file ? (
            <>
              <Upload className="w-10 h-10 text-primary mb-2" />
              <p className="text-sm text-muted-foreground">
                Drag & drop your file here or{" "}
                <label htmlFor="file-upload" className="text-primary font-medium cursor-pointer">
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
                <span className="text-sm font-medium truncate max-w-[180px]">{file.name}</span>
              </div>
              <button
                onClick={() => setFile(null)}
                className="text-muted-foreground hover:text-destructive transition"
              >
                <XCircle size={20} />
              </button>
            </motion.div>
          )}
        </motion.div>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={uploadStatus === "loading"}>
            {uploadStatus === "loading" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...
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
