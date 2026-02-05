/* eslint-disable @typescript-eslint/no-explicit-any */
import { VITE_PUBLIC_API_URL, VITE_PUBLIC_API_URL_TEMPLATE_FRONTEND } from "@/config";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";


export const BASE_URL = VITE_PUBLIC_API_URL;
export const BASE_URL_TEMPLATE = VITE_PUBLIC_API_URL_TEMPLATE_FRONTEND
// ------------------- Thunk -------------------
export const createProduct = createAsyncThunk(
  "products/createProduct",
  async (formData: FormData, { rejectWithValue,getState }) => {
    try {
      const state:any = getState()

      const token = state?.auth?.token
      const response = await axios.post(
        `${BASE_URL}/products/create`,
        formData,
        {
          headers: {
     
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

// ------------------- Slice -------------------
interface ProductState {
  loading: boolean;
  success: boolean;
  error: string | null;
  product: any | null;
}

const initialState: ProductState = {
  loading: false,
  success: false,
  error: null,
  product: null,
};

const productSlice = createSlice({
  name: "product",
  initialState,
  reducers: {
    resetProductState: (state) => {
      state.loading = false;
      state.success = false;
      state.error = null;
      state.product = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createProduct.pending, (state) => {
        state.loading = true;
        state.success = false;
        state.error = null;
      })
      .addCase(createProduct.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.product = action.payload;
      })
      .addCase(createProduct.rejected, (state, action) => {
        state.loading = false;
        state.success = false;
        state.error = action.payload as string;
      });
  },
});

export const { resetProductState } = productSlice.actions;
export default productSlice.reducer;
