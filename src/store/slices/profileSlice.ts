// src/store/slices/profileSlice.ts
import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit'
import api from '@/lib/axios'

interface BaseProfile {
  id: string
  name: string
  email: string
  role: string
  createdAt: string
  updatedAt: string
  [key: string]: any // allow dynamic extra fields
}

interface ProfileState {
  profile: BaseProfile | null
  loading: boolean
  error: string | null
}

const initialState: ProfileState = {
  profile: null,
  loading: false,
  error: null,
}

export const fetchProfile = createAsyncThunk(
  'profile/fetchProfile',
  async (_, { rejectWithValue,  }) => {
    try {
      const res = await api.get('/profile')
      return { ...res.data.data } // include role in response
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.message || 'Failed to fetch profile'
      )
    }
  }
)

const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    clearProfile: (state) => {
      state.profile = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProfile.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(
        fetchProfile.fulfilled,
        (state, action: PayloadAction<BaseProfile>) => {
          state.loading = false
          state.profile = action.payload
        }
      )
      .addCase(fetchProfile.rejected, (state, action: PayloadAction<any>) => {
        state.loading = false
        state.error = action.payload
      })
  },
})

export const { clearProfile } = profileSlice.actions
export default profileSlice.reducer
