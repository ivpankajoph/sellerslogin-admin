import { combineReducers } from '@reduxjs/toolkit'
import categoryReducer from './slices/admin/categorySlice'
import subcategoryReducer from './slices/admin/subcategorySlice'
import vendorReducer from './slices/admin/vendorSlice'
import authReducer from './slices/authSlice'
import profileReducer from './slices/profileSlice'
import productReducer from './slices/vendor/productSlice'
import vendorProfileReducer from './slices/vendor/profileSlice'
import specificationReducer from './slices/admin/specificationSlice'

const appReducer = combineReducers({
  auth: authReducer,
  profile: profileReducer,
  product: productReducer,
  categories: categoryReducer,
  subcategories: subcategoryReducer,
  vendors: vendorReducer,
  vendorprofile:vendorProfileReducer,
  specifications: specificationReducer,
})

const rootReducer = (state: any, action: any) => {
  if (action.type === 'auth/logout') {
    state = undefined
  }

  return appReducer(state, action)
}

export default rootReducer
