import { configureStore } from '@reduxjs/toolkit'
import themeSlice from './slices/themeSlice'
import userSlice from './slices/userSlice'

export const store = configureStore({
  reducer: {
    theme: themeSlice,
    user: userSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch