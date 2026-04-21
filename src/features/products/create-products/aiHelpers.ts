// src/components/ProductCreate/utils/aiHelpers.ts

import { toast } from 'sonner';
import type { Dispatch, SetStateAction } from 'react';

type AiLoadingSetter = Dispatch<SetStateAction<Record<string, boolean>>>;
type SetFormData = Dispatch<SetStateAction<any>>;

export const generateWithAI = async (
  field: string,
  context: string,
  setAiLoading: AiLoadingSetter,
  setFormData: SetFormData,
) => {
  setAiLoading((prev: any) => ({ ...prev, [field]: true }));
  try {
    const res = await fetch(
      `${import.meta.env.VITE_PUBLIC_API_URL}/v1/products/generate-field`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field, context }),
      }
    );
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'AI generation failed');
    setFormData((prev: any) => ({ ...prev, [field]: data.data }));
  } catch (err: any) {
    toast.error(err.message || 'AI generation failed');
  } finally {
    setAiLoading((prev: any) => ({ ...prev, [field]: false }));
  }
};

export const generateSpecifications = async (
  formData: any,
  selectedCategoryIds: string[],
  categories: any[],
  specificationKeys: string[],
  setAiLoading: AiLoadingSetter,
  setFormData: SetFormData,
) => {
  setAiLoading((prev: any) => ({ ...prev, specifications: true }));
  try {
    const categoryNames = categories
      .filter((cat: any) => selectedCategoryIds.includes(cat._id))
      .map((cat: any) => cat.name)
      .filter(Boolean);

    const context = `
Product: ${formData.productName}
Categories: ${categoryNames.join(", ") || "N/A"}
Brand: ${formData.brand}
`;
    const res = await fetch(
      `${import.meta.env.VITE_PUBLIC_API_URL}/v1/products/generate-specifications`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context, specificationKeys }),
      }
    );
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Specification generation failed');

    setFormData((prev: any) => ({
      ...prev,
      specifications: [data.data],
    }));
  } catch (err: any) {
    toast.error(err.message || 'Specification generation failed');
  } finally {
    setAiLoading((prev: any) => ({ ...prev, specifications: false }));
  }
};

export const generateSpecificationKeysHelper = async (
  categoryName: string,
  productName: string,
  setAiLoading: AiLoadingSetter,
  setSpecificationKeys: Dispatch<SetStateAction<string[]>>,
  setFormData: SetFormData,
) => {
  if (!categoryName) return;

  setAiLoading((prev: any) => ({ ...prev, specificationKeys: true }));
  try {
    const res = await fetch(
      `${import.meta.env.VITE_PUBLIC_API_URL}/v1/products/generate-specification-keys`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: categoryName, productName }),
      }
    );
    const data = await res.json();
    if (!data.success || !Array.isArray(data.data)) throw new Error(data.message || 'Failed to generate specification keys');

    const newKeys = data.data;
    setSpecificationKeys(newKeys);

    // Also reset the specifications in form data to match new keys
    const initialSpec: Record<string, string> = {};
    newKeys.forEach((key: string) => (initialSpec[key] = ''));

    setFormData((prev: any) => ({
      ...prev,
      specifications: [initialSpec],
    }));

  } catch (err: any) {
    console.error("Failed to generate spec keys", err);
    toast.error(err.message || 'Failed to generate specification keys');
  } finally {
    setAiLoading((prev: any) => ({ ...prev, specificationKeys: false }));
  }
};
