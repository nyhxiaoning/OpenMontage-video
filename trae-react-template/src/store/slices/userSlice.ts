import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface IUser {
  id: number
  username: string
  email: string
  role: string
  avatar?: string
}

interface UserState {
  currentUser: IUser | null
  isAuthenticated: boolean
  permissions: string[]
}

const initialState: UserState = {
  currentUser: null,
  isAuthenticated: false,
  permissions: [],
}

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<IUser>) => {
      state.currentUser = action.payload
      state.isAuthenticated = true
    },
    clearUser: (state) => {
      state.currentUser = null
      state.isAuthenticated = false
      state.permissions = []
    },
    setPermissions: (state, action: PayloadAction<string[]>) => {
      state.permissions = action.payload
    },
  },
})

export const { setUser, clearUser, setPermissions } = userSlice.actions
export default userSlice.reducer