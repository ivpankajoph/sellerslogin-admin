/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios'
import { VITE_PUBLIC_API_URL } from '@/config'
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'

interface CategoryState {
  loading: boolean
  error: string | null
  categories: any[]
  pagination: {
    page: number
    totalPages: number
    total: number
    limit: number
  }
  uploadStatus: 'idle' | 'loading' | 'succeeded' | 'failed'
  uploadError: string | null
}

const initialState: CategoryState = {
  loading: false,
  error: null,
  categories: [],
  pagination: {
    page: 1,
    totalPages: 1,
    total: 0,
    limit: 10,
  },
  uploadStatus: 'idle',
  uploadError: null,
}

const BASE_URL = VITE_PUBLIC_API_URL

export const createCategory = createAsyncThunk(
  'categories/create',
  async (payload: any, { rejectWithValue, getState }) => {
    try {
      const state: any = getState()
      const token = state?.auth?.token

      const res = await axios.post(
        `${BASE_URL}/v1/categories/create`,
        payload, // <-- JSON Data
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json', // <-- IMPORTANT
          },
        }
      )

      return res.data
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.message || 'Failed to create category'
      )
    }
  }
)

export const updateCategory = createAsyncThunk(
  'category/updateCategory',
  async (categoryData: any, { rejectWithValue, getState }) => {
    try {
      const state: any = getState()
      const token = state?.auth?.token
      const response = await axios.put(
        `${BASE_URL}/v1/categories/update/${categoryData.id}`,
        categoryData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      )
      return response.data
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to update category'
      )
    }
  }
)

export const getAllCategories = createAsyncThunk(
  'categories/getAll',
  async (
    {
      page,
      limit,
      search,
      level,
      main_category_id,
    }: {
      page?: number
      limit?: number
      search?: string
      level?: string
      main_category_id?: string
    } = {},
    { rejectWithValue }
  ) => {
    try {
      const params: Record<string, string | number> = {}
      if (page) params.page = page
      if (limit) params.limit = limit
      if (search) params.search = search
      if (level && level !== 'all') params.level = level
      if (main_category_id && main_category_id !== 'all') {
        params.main_category_id = main_category_id
      }

      const res = await axios.get(`${BASE_URL}/v1/categories/getall`, {
        params,
      })
      return {
        data: res.data?.data || [],
        pagination: res.data?.pagination || {
          page: page || 1,
          limit: limit || (res.data?.data?.length || 10),
          total: res.data?.data?.length || 0,
          totalPages: 1,
        },
      }
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.message || 'Failed to fetch categories'
      )
    }
  }
)
export const uploadCategories = createAsyncThunk(
  'categories/upload',
  async (file: File, { getState, rejectWithValue }) => {
    try {
      const state: any = getState()
      const token = state.auth?.token

      const formData = new FormData()
      formData.append('file', file)

      const response = await axios.post(
        `${BASE_URL}/v1/categories/import`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`,
          },
        }
      )

      return response.data
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'File upload failed'
      )
    }
  }
)
const categorySlice = createSlice({
  name: 'category',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(createCategory.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(createCategory.fulfilled, (state, action) => {
        state.loading = false
        state.categories.push(action.payload)
      })
      .addCase(createCategory.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      .addCase(getAllCategories.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(getAllCategories.fulfilled, (state, action) => {
        state.loading = false
        state.categories = action.payload.data
        state.pagination = {
          ...state.pagination,
          ...action.payload.pagination,
        }
      })
      .addCase(getAllCategories.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      .addCase(updateCategory.pending, (state) => {
        state.loading = true
      })
      .addCase(updateCategory.fulfilled, (state, action) => {
        state.loading = false
        // Update the category in the list
        const index = state.categories.findIndex(
          (cat) => cat.id === action.payload.id
        )
        if (index !== -1) {
          state.categories[index] = action.payload
        }
      })
      .addCase(updateCategory.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      .addCase(uploadCategories.pending, (state) => {
        state.uploadStatus = 'loading'
        state.uploadError = null
      })
      .addCase(uploadCategories.fulfilled, (state) => {
        state.uploadStatus = 'succeeded'
      })
      .addCase(uploadCategories.rejected, (state, action) => {
        state.uploadStatus = 'failed'
        state.uploadError = action.payload as string
      })
  },
})

export default categorySlice.reducer
