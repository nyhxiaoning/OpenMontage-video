import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AppState {
  collapsed: boolean;
  theme: 'light' | 'dark';
  language: 'zh-CN' | 'en-US';
  breadcrumbs: Array<{ title: string; path: string }>;
}

const initialState: AppState = {
  collapsed: false,
  theme: 'light',
  language: 'zh-CN',
  breadcrumbs: [],
};

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.collapsed = !state.collapsed;
    },
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.theme = action.payload;
    },
    setLanguage: (state, action: PayloadAction<'zh-CN' | 'en-US'>) => {
      state.language = action.payload;
    },
    setBreadcrumbs: (state, action: PayloadAction<Array<{ title: string; path: string }>>) => {
      state.breadcrumbs = action.payload;
    },
  },
});

export const { toggleSidebar, setTheme, setLanguage, setBreadcrumbs } = appSlice.actions;
export default appSlice.reducer;