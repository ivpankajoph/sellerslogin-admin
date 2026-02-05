import { Button } from "@/components/ui/button";
import { CheckCircle, AlertCircle, Upload } from "lucide-react";

interface Type {
  submitStatus: any
  isSubmitting: any
  uploadingPaths: any
  handleSubmit:any
}
export function SubmitSection({
  submitStatus,
  isSubmitting,
  uploadingPaths,
  handleSubmit,
}:Type) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
      <div>
        {submitStatus === "success" && (
          <div className="flex items-center text-green-600">
            <CheckCircle className="mr-2 h-5 w-5" />
            <span>Template saved successfully!</span>
          </div>
        )}

        {submitStatus === "error" && (
          <div className="flex items-center text-red-600">
            <AlertCircle className="mr-2 h-5 w-5" />
            <span>Failed to save. Please try again.</span>
          </div>
        )}
      </div>

      <Button
        onClick={handleSubmit}
        disabled={isSubmitting || uploadingPaths.size > 0}
        className="h-12 bg-gradient-to-r from-indigo-600 to-purple-600 px-8 text-white shadow-lg"
      >
        {isSubmitting ? (
          <div className="flex items-center">
            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            Saving...
          </div>
        ) : uploadingPaths.size > 0 ? (
          <div className="flex items-center">
            <Upload className="mr-2 h-4 w-4 animate-pulse" />
            Uploading Images...
          </div>
        ) : (
          <div className="flex items-center">
            <CheckCircle className="mr-2 h-4 w-4" />
            Save Template
          </div>
        )}
      </Button>
    </div>
  );
}
