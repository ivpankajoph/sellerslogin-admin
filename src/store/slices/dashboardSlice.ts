import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import api from "@/lib/axios";

interface SummaryStats {
  totalUsers?: number;
  totalVendors?: number;
  totalProducts: number;
  totalOrders: number;
  totalRevenue?: number;
}

interface DashboardData {
  summary: SummaryStats;
  recentOrders: any[];
  topVendors?: any[];
  vendor?: any;
  stats?: any;
}

interface DashboardState {
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
}

const initialState: DashboardState = {
  data: null,
  loading: false,
  error: null,
};

// ✅ Fetch dashboard dynamically based on role
export const fetchDashboard = createAsyncThunk(
  "dashboard/fetchDashboard",
  async (_, { rejectWithValue }) => {
    try {
      
      const res = await api.get("/dashboard");
      return res.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch dashboard");
    }
  }
);

const dashboardSlice = createSlice({
  name: "dashboard",
  initialState,
  reducers: {
    clearDashboard: (state) => {
      state.data = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboard.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDashboard.fulfilled, (state, action: PayloadAction<DashboardData>) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchDashboard.rejected, (state, action: PayloadAction<any>) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearDashboard } = dashboardSlice.actions;
export default dashboardSlice.reducer;
