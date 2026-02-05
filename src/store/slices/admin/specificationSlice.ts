import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import axios, { type AxiosError } from "axios";
import { BASE_URL } from "../vendor/productSlice";

// ----------------------
// Types
// ----------------------

export interface SingleSpecItem {
  name: string;
  value: string;
}

export interface Specification {
  _id: string;
  category_id: string;
  title: string;
  specs: SingleSpecItem[];
}

interface ApiResponse {
  data: Specification[];
}

interface SpecificationsState {
  specs: Specification[];
  loading: boolean;
  error: string | null;
}

// ----------------------
// Thunk
// ----------------------

export const fetchSpecificationsByCategory = createAsyncThunk<
  Specification[], // return type
  string,          // argument type (categoryId)
  { rejectValue: string }
>(
  "specifications/fetchByCategory",
  async (categoryId, { rejectWithValue }) => {
    try {
      const res = await axios.get<ApiResponse>(
        `${BASE_URL}/specifications/category/${categoryId}`
      );
      return res.data.data;
    } catch (err) {
      const error = err as AxiosError<{ message: string }>;
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch specifications"
      );
    }
  }
);

// ----------------------
// Slice
// ----------------------

const initialState: SpecificationsState = {
  specs: [],
  loading: false,
  error: null,
};

const specificationsSlice = createSlice({
  name: "specifications",
  initialState,
  reducers: {},

  extraReducers: (builder) => {
    builder
      .addCase(fetchSpecificationsByCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchSpecificationsByCategory.fulfilled,
        (state, action: PayloadAction<Specification[]>) => {
          state.loading = false;
          state.specs = action.payload;
        }
      )
      .addCase(
        fetchSpecificationsByCategory.rejected,
        (state, action: PayloadAction<string | undefined>) => {
          state.loading = false;
          state.error = action.payload || "Something went wrong";
        }
      );
  },
});

export default specificationsSlice.reducer;
