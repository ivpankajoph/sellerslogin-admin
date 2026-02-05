// src/components/ProductCreate/Step2Images.tsx

import React from 'react';
import { Upload, Trash2, Loader2 } from 'lucide-react';

interface Props {
  defaultImages: { url: string; uploading?: boolean }[];
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDelete: (index: number) => void;
}

const Step2Images: React.FC<Props> = ({ defaultImages, onUpload, onDelete }) => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Images & Media</h2>
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">Default Product Images *</label>
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-6 text-center">
          <input type="file" multiple accept="image/*" onChange={onUpload} className="hidden" id="default-images" />
          <label htmlFor="default-images" className="cursor-pointer">
            <Upload className="mx-auto mb-2 h-12 w-12 text-gray-400" />
            <p className="text-sm text-gray-600">Click to upload images</p>
          </label>
        </div>
        <div className="mt-4 grid grid-cols-4 gap-4">
          {defaultImages.map((img, index) => (
            <div key={index} className="group relative">
              {img.uploading ? (
                <div className="flex aspect-square items-center justify-center rounded-lg bg-gray-200">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : (
                <>
                  <img src={img.url} alt="" className="aspect-square w-full rounded-lg object-cover" />
                  <button
                    type="button"
                    onClick={() => onDelete(index)}
                    className="absolute top-2 right-2 rounded-full bg-red-500 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Step2Images;