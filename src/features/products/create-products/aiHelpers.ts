// src/components/ProductCreate/utils/aiHelpers.ts

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
    if (!data.success) throw new Error();
    setFormData((prev: any) => ({ ...prev, [field]: data.data }));
  } catch (err) {
    alert('AI generation failed');
  } finally {
    setAiLoading((prev: any) => ({ ...prev, [field]: false }));
  }
};

export const generateSpecifications = async (
  formData: any,
  selectedCategoryId: string,
  categories: any[],
  specificationKeys: string[],
  setAiLoading: AiLoadingSetter,
  setFormData: SetFormData,
) => {
  setAiLoading((prev: any) => ({ ...prev, specifications: true }));
  try {
    const category = categories.find((cat: any) => cat._id === selectedCategoryId);
    const context = `
Product: ${formData.productName}
Category: ${category?.name}
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
    if (!data.success) throw new Error();

    setFormData((prev: any) => ({
      ...prev,
      specifications: [data.data],
    }));
  } catch (err) {
    alert('Specification generation failed');
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
    if (!data.success || !Array.isArray(data.data)) throw new Error();

    const newKeys = data.data;
    setSpecificationKeys(newKeys);

    // Also reset the specifications in form data to match new keys
    const initialSpec: Record<string, string> = {};
    newKeys.forEach((key: string) => (initialSpec[key] = ''));

    setFormData((prev: any) => ({
      ...prev,
      specifications: [initialSpec],
    }));

  } catch (err) {
    console.error("Failed to generate spec keys", err);
    // Fallback logic could go here, or just alert
  } finally {
    setAiLoading((prev: any) => ({ ...prev, specificationKeys: false }));
  }
};
