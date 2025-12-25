import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { LogisticRequest } from '../../types/Order';

interface OrdersState {
  orders: LogisticRequest[];
  currentOrder: LogisticRequest | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: OrdersState = {
  orders: [],
  currentOrder: null,
  isLoading: false,
  error: null,
};

const ordersSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
    setOrders(state, action: PayloadAction<LogisticRequest[]>) {
      state.orders = action.payload;
    },
    setCurrentOrder(state, action: PayloadAction<LogisticRequest | null>) {
      state.currentOrder = action.payload;
    },
    clearOrdersState(state) {
      state.orders = [];
      state.currentOrder = null;
      state.isLoading = false;
      state.error = null;
    },
    clearOrdersError(state) {
      state.error = null;
    },
  },
});

export const { setLoading, setError, setOrders, setCurrentOrder, clearOrdersState, clearOrdersError } = ordersSlice.actions;
export default ordersSlice.reducer;
