import axios from 'axios'
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { BASE_URL } from './productSlice'

export const fetchVendorProfile = createAsyncThunk(
  'vendor/fetchProfile',
  async (_, { rejectWithValue, getState }) => {
    try {
      const state: any = getState()
      const token = state?.auth?.token
      const res = await axios.get(`${BASE_URL}/v1/vendors/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      return res.data
    } catch (error: any) {
      return rejectWithValue(error.response?.data || 'Failed to fetch profile')
    }
  }
)

const vendorSlice = createSlice({
  name: 'vendor',
  initialState: {
    profile: null,
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchVendorProfile.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchVendorProfile.fulfilled, (state, action) => {
        state.loading = false
        state.profile = action.payload
      })
      .addCase(fetchVendorProfile.rejected, (state) => {
        state.loading = false
        state.profile = null
      })
  },
})

export default vendorSlice.reducer
