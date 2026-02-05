import React, { useState } from 'react';
import {
  Upload,
  Download,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileSpreadsheet,
  Loader2,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { useSelector } from 'react-redux';

interface UploadError {
  rows: number[];
  productName: string;
  errors: string[];
}

interface UploadResult {
  success: boolean;
  successCount: number;
  failureCount: number;
  errors: UploadError[];
  successfulProducts: Array<{
    productId: string;
    productName: string;
    slug: string;
  }>;
}

const normalizeRows = (value: unknown): number[] => {
  if (Array.isArray(value)) {
    return value.filter((row) => typeof row === 'number') as number[];
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return [value];
  }
  if (typeof value === 'string') {
    return value
      .split(/[,;|\s]+/)
      .map((chunk) => chunk.trim())
      .filter(Boolean)
      .map((chunk) => Number(chunk))
      .filter((row) => Number.isFinite(row) && row > 0);
  }
  return [];
};

const safeResult = (raw: any): UploadResult => {
  if (!raw || typeof raw !== 'object') {
    return {
      success: false,
      successCount: 0,
      failureCount: 0,
      errors: [],
      successfulProducts: [],
    };
  }

  const errors = Array.isArray(raw.errors)
    ? raw.errors.map((entry: any) => {
        const productName =
          typeof entry.productName === 'string'
            ? entry.productName
            : 'Unknown Product';

        const messages =
          Array.isArray(entry.errors) && entry.errors.length > 0
            ? entry.errors.filter((err: any) => typeof err === 'string')
            : typeof entry.error === 'string'
            ? [entry.error]
            : ['Unknown validation error'];

        return {
          rows: normalizeRows(entry.rows ?? entry.row ?? []),
          productName,
          errors: messages.length ? messages : ['Unknown validation error'],
        };
      })
    : [];

  const successfulProducts = Array.isArray(raw.successfulProducts)
    ? raw.successfulProducts.map((p: any) => ({
        productId: typeof p.productId === 'string' ? p.productId : '',
        productName: typeof p.productName === 'string' ? p.productName : 'Unknown',
        slug: typeof p.slug === 'string' ? p.slug : '',
      }))
    : [];

  return {
    success: Boolean(raw.success),
    successCount: typeof raw.successCount === 'number' ? raw.successCount : 0,
    failureCount: typeof raw.failureCount === 'number' ? raw.failureCount : 0,
    errors,
    successfulProducts,
  };
};

const ExcelProductUpload: React.FC = () => {
  const token = useSelector((state: any) => state.auth.token);

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (validateFile(droppedFile)) {
        setFile(droppedFile);
        setResult(null);
      }
    }
  };

  const downloadTemplate = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_PUBLIC_API_URL}/v1/products/download-template`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to download template');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'product_upload_template.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Unable to download template. Please try again.');
    }
  };

  const validateFile = (file: File): boolean => {
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const isValid =
      fileExtension === 'xlsx' ||
      fileExtension === 'csv' ||
      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.type === 'application/vnd.ms-excel' ||
      file.type === 'text/csv';

    if (!isValid) {
      alert('Please upload a valid Excel or CSV file (.xlsx or .csv)');
      return false;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return false;
    }

    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (validateFile(selectedFile)) {
        setFile(selectedFile);
        setResult(null);
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const url = `${import.meta.env.VITE_PUBLIC_API_URL}/v1/products/bulk-upload`;
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        const parsedResult = safeResult(data.data || data);
        setResult(parsedResult);
      } else {
        const message = data?.message || 'Upload failed due to server error.';
        setResult({
          success: false,
          successCount: 0,
          failureCount: 0,
          errors: [{ rows: [0], productName: 'System', errors: [message] }],
          successfulProducts: [],
        });
      }
    } catch {
      const errorMsg = 'Network error. Please check your connection and try again.';
      setResult({
        success: false,
        successCount: 0,
        failureCount: 0,
        errors: [{ rows: [0], productName: 'System', errors: [errorMsg] }],
        successfulProducts: [],
      });
    } finally {
      setUploading(false);
    }
  };

  const resetUpload = () => {
    setFile(null);
    setResult(null);
  };

  const goBack = () => {
    window.history.back();
  };

  return (
  <div className="min-h-screen bg-white px-4 py-8 text-gray-900">
  <div className="mx-auto max-w-5xl space-y-6">
    <div className="flex items-center gap-4">
      <button
        onClick={goBack}
        className="group flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-800 shadow-sm transition-all hover:bg-gray-50 hover:shadow-md"
      >
        <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-1" />
        <span className="font-medium">Back</span>
      </button>

      <div className="flex-1 rounded-lg border border-gray-300 bg-white px-6 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-md bg-black p-2">
            <Sparkles className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-black">Bulk Product Upload</h1>
            <p className="text-sm text-gray-600">Upload multiple products at once using Excel</p>
          </div>
        </div>
      </div>
    </div>

    {/* Main Content Card */}
    <div className="overflow-hidden rounded-xl border border-gray-300 bg-white shadow-lg">
      <div className="bg-black px-6 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Upload Your File</h2>
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-2 rounded-md bg-white px-4 py-2 font-medium text-black shadow transition-all hover:bg-gray-100"
          >
            <Download size={18} />
            Download Template
          </button>
        </div>
      </div>

      <div className="p-8">
        {!result && (
          <>
            <div
              className={`relative rounded-xl border-2 border-dashed p-12 text-center transition-all duration-300 ${
                dragActive
                  ? 'scale-[1.02] border-black bg-gray-50'
                  : 'border-gray-400 hover:border-gray-600 hover:bg-gray-50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {file ? (
                <div className="animate-in fade-in space-y-4 duration-300">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-xl bg-black shadow">
                    <FileSpreadsheet size={40} className="text-white" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-gray-900">{file.name}</p>
                    <p className="mt-1 text-sm text-gray-600">{(file.size / 1024).toFixed(2)} KB</p>
                  </div>
                  <button
                    onClick={resetUpload}
                    className="text-sm font-medium text-red-600 transition hover:text-red-700 hover:underline"
                  >
                    Remove file
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-xl bg-gray-100">
                    <Upload size={40} className="text-black" />
                  </div>
                  <div>
                    <p className="mb-1 text-xl font-bold text-gray-900">Drop your Excel file here</p>
                    <p className="text-gray-600">or click to browse</p>
                  </div>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-black px-8 py-3 font-semibold text-white shadow transition-all hover:bg-gray-900">
                    <Upload size={18} />
                    Browse Files
                    <input
                      type="file"
                      accept=".xlsx,.csv"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                  <p className="text-sm text-gray-600">
                    Supported: <span className="font-medium">.xlsx, .csv</span> • Max size:{' '}
                    <span className="font-medium">10MB</span>
                  </p>
                </div>
              )}
            </div>

            {file && (
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="mt-8 flex w-full items-center justify-center gap-3 rounded-xl bg-black px-8 py-4 text-lg font-bold text-white shadow transition-all hover:bg-gray-900 disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                {uploading ? (
                  <>
                    <Loader2 size={24} className="animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload size={24} />
                    Upload Products
                  </>
                )}
              </button>
            )}
          </>
        )}

        {result && (
          <div className="animate-in fade-in space-y-6 duration-500">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-xl border-2 border-green-600 bg-green-50 p-6 shadow">
                <div className="mb-3 flex items-center gap-3">
                  <div className="rounded-md bg-green-600 p-2">
                    <CheckCircle className="text-white" size={24} />
                  </div>
                  <span className="text-lg font-bold text-green-800">Successful</span>
                </div>
                <p className="text-5xl font-black text-green-700">{result.successCount}</p>
              </div>

              <div className="rounded-xl border-2 border-red-600 bg-red-50 p-6 shadow">
                <div className="mb-3 flex items-center gap-3">
                  <div className="rounded-md bg-red-600 p-2">
                    <XCircle className="text-white" size={24} />
                  </div>
                  <span className="text-lg font-bold text-red-800">Failed</span>
                </div>
                <p className="text-5xl font-black text-red-700">{result.failureCount}</p>
              </div>
            </div>

            {/* Successfully Created Products */}
            {(result?.successfulProducts ?? []).length > 0 && (
              <div className="rounded-xl border-2 border-green-600 bg-green-50 p-6 shadow">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-green-800">
                  <CheckCircle size={20} />
                  Successfully Created Products
                </h3>
                <div className="custom-scrollbar max-h-80 space-y-3 overflow-y-auto pr-2">
                  {(result?.successfulProducts ?? []).map((product, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-green-200 bg-white p-4 shadow-sm"
                    >
                      <p className="text-base font-semibold text-gray-900">{product.productName}</p>
                      <p className="mt-1 text-sm text-gray-600">
                        <span className="font-medium">Slug:</span> {product.slug}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Errors */}
            {(result?.errors ?? []).length > 0 && (
              <div className="rounded-xl border-2 border-red-600 bg-red-50 p-6 shadow">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-red-800">
                  <AlertCircle size={20} />
                  Errors ({(result?.errors ?? []).length})
                </h3>
                <div className="custom-scrollbar max-h-96 space-y-3 overflow-y-auto pr-2">
                  {(result?.errors ?? []).map((error, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-red-200 bg-white p-4 shadow-sm"
                    >
                      <p className="mb-2 text-base font-semibold text-gray-900">
                        {(error.rows.length
                          ? error.rows.length > 1
                            ? `Rows ${error.rows.join(', ')}`
                            : `Row ${error.rows[0]}`
                          : 'Row unknown')}
                        : {error.productName || 'Unknown Product'}
                      </p>
                      <ul className="ml-2 space-y-1 text-sm text-red-700">
                        {(error.errors ?? []).map((err, errIdx) => (
                          <li key={errIdx} className="flex items-start gap-2">
                            <span className="mt-0.5 text-red-500">•</span>
                            <span>{err}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={resetUpload}
              className="w-full rounded-xl bg-black px-8 py-4 text-lg font-bold text-white shadow transition-all hover:bg-gray-900"
            >
              Upload Another File
            </button>
          </div>
        )}
      </div>
    </div>

    {/* Info Card */}
    <div className="rounded-xl border-2 border-gray-300 bg-gray-50 p-6 shadow">
      <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
        <AlertCircle size={20} />
        Important Guidelines
      </h3>
      <ul className="space-y-2 text-sm text-gray-700">
        <li className="flex items-start gap-2">
          <span className="mt-0.5 text-gray-500">✓</span>
          <span>Download the template to ensure correct format</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-0.5 text-gray-500">✓</span>
          <span>All required fields must be filled</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-0.5 text-gray-500">✓</span>
          <span>Variants should be in JSON format</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-0.5 text-gray-500">✓</span>
          <span>Images should be valid URLs or will be uploaded separately</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-0.5 text-gray-500">✓</span>
          <span>Products will be created with 'pending' status for approval</span>
        </li>
      </ul>
    </div>
  </div>

  <style>{`
    .custom-scrollbar::-webkit-scrollbar {
      width: 8px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: #f9fafb;
      border-radius: 10px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: #d1d5db;
      border-radius: 10px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: #9ca3af;
    }
    @keyframes fade-in {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    .animate-in {
      animation: fade-in 0.3s ease-out;
    }
  `}</style>
</div>
  );
};

export default ExcelProductUpload;
