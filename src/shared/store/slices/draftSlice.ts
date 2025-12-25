import { createSlice, PayloadAction } from '@reduxjs/toolkit';

/**
 * User-draft (черновик) — отдельное состояние конструктора заявки.
 *
 * Требование лаб7: при выходе сбрасываем конструктор заявки.
 * Поэтому этот slice можно полностью очистить экшеном resetDraftState.
 */
interface DraftState {
  draftId: number | null;
  count: number;
  isLoading: boolean;
  error: string | null;
}

const initialState: DraftState = {
  draftId: null,
  count: 0,
  isLoading: false,
  error: null,
};

const draftSlice = createSlice({
  name: 'draft',
  initialState,
  reducers: {
    setDraftLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
    setDraftError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
    setDraft(state, action: PayloadAction<{ draftId: number | null; count: number }>) {
      state.draftId = action.payload.draftId;
      state.count = action.payload.count;
    },
    resetDraftState(state) {
      state.draftId = null;
      state.count = 0;
      state.isLoading = false;
      state.error = null;
    },
    clearDraftError(state) {
      state.error = null;
    },
  },
});

export const { setDraftLoading, setDraftError, setDraft, resetDraftState, clearDraftError } = draftSlice.actions;
export default draftSlice.reducer;

