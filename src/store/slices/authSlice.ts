/* eslint-disable @typescript-eslint/no-explicit-any */

import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import axios from "axios";


interface AuthState {
  token: string | null;
  user: any | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}


const initialState: AuthState = {
  token: null,
  user: null,
  loading: false,
  error: null,
  isAuthenticated: false,
};
const BASE_URL = import.meta.env.VITE_PUBLIC_API_URL;

const mergeTeamMemberSession = (currentUser: any, nextUser: any) => {
  const safeCurrentUser =
    currentUser && typeof currentUser === "object" ? currentUser : null;
  const safeNextUser =
    nextUser && typeof nextUser === "object" ? nextUser : nextUser;

  const currentAccountType = String(safeCurrentUser?.account_type || "")
    .trim()
    .toLowerCase();
  const nextAccountType = String((safeNextUser as any)?.account_type || "")
    .trim()
    .toLowerCase();
  const nextRole = String((safeNextUser as any)?.role || safeCurrentUser?.role || "")
    .trim()
    .toLowerCase();

  if (
    currentAccountType !== "vendor_user" ||
    nextAccountType === "vendor_user" ||
    nextRole !== "vendor" ||
    !safeCurrentUser ||
    !safeNextUser ||
    typeof safeNextUser !== "object"
  ) {
    return safeNextUser;
  }

  return {
    ...safeNextUser,
    id: safeCurrentUser.id || (safeNextUser as any).id,
    vendor_id:
      safeCurrentUser.vendor_id ||
      (safeNextUser as any).vendor_id ||
      (safeNextUser as any).id,
    actor_id: safeCurrentUser.actor_id,
    account_type: "vendor_user",
    is_team_member: true,
    role: "vendor",
    name: safeCurrentUser.name || (safeNextUser as any).name,
    email: safeCurrentUser.email || (safeNextUser as any).email,
    avatar: safeCurrentUser.avatar || (safeNextUser as any).avatar || "",
    page_access: Array.isArray(safeCurrentUser.page_access)
      ? safeCurrentUser.page_access
      : [],
    website_access: Array.isArray(safeCurrentUser.website_access)
      ? safeCurrentUser.website_access
      : [],
    vendor_name:
      safeCurrentUser.vendor_name ||
      (safeNextUser as any).vendor_name ||
      (safeNextUser as any).name ||
      (safeNextUser as any).business_name ||
      "",
    must_change_password: false,
  };
};


export const loginAdmin = createAsyncThunk(
  "auth/loginAdmin",
  async (
    credentials: { email: string; password: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await axios.post(`${BASE_URL}/v1/auth/login`, credentials);

      if (!response.data?.success) {
        return rejectWithValue(
          response.data?.message || "Login failed."
        );
      }

      return response.data;
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "An error occurred during login.";
      return rejectWithValue(message);
    }
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout: (state) => {
      state.token = null;
      state.user = null;
      state.isAuthenticated = false;
      state.error = null;
    },
    setUser: (state, action: PayloadAction<any>) => {
      state.user = mergeTeamMemberSession(state.user, action.payload);
    },
    setAuthSession: (
      state,
      action: PayloadAction<{ token: string; user: any | null }>
    ) => {
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.isAuthenticated = Boolean(action.payload.token);
      state.error = null;
      state.loading = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginAdmin.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        loginAdmin.fulfilled,
        (state, action: PayloadAction<{ token: string; data: any }>) => {
          state.loading = false;
          state.token = action.payload.token;
          state.user = action.payload.data;
          state.isAuthenticated = true;
        }
      )
      .addCase(loginAdmin.rejected, (state, action: PayloadAction<any>) => {
        state.loading = false;
        state.token = null;
        state.user = null;
        state.isAuthenticated = false;
        state.error =
          typeof action.payload === "string"
            ? action.payload
            : "An error occurred during login.";
      });
  },
});

export const { logout, setUser, setAuthSession } = authSlice.actions;
export default authSlice.reducer;
