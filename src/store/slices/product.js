// third party
import { createSlice } from '@reduxjs/toolkit';

// project imports
import axios from '../../utils/axios';
import { dispatch } from '../index';

// ==============================|| SLICE - PRODUCT ||============================== //

const initialState = {
  error: null,
  products: [],
  product: null,
  relatedProducts: [],
  reviews: [],
  addresses: []
};

const slice = createSlice({
  name: 'product',
  initialState,
  reducers: {
    // HAS ERROR
    hasError(state, action) {
      state.error = action.payload;
    },

    // GET PRODUCTS
    getProductsSuccess(state, action) {
      state.products = action.payload;
    },

    // FILTER PRODUCTS
    filterProductsSuccess(state, action) {
      state.products = action.payload;
    },

    // GET PRODUCT
    getProductSuccess(state, action) {
      state.product = action.payload;
    },

    // GET RELATED PRODUCTS
    getRelatedProductsSuccess(state, action) {
      state.relatedProducts = action.payload;
    },

    // GET PRODUCT REVIEWS
    getProductReviewsSuccess(state, action) {
      state.reviews = action.payload;
    },

    // GET ADDRESSES
    getAddressesSuccess(state, action) {
      state.addresses = action.payload;
    },

    // ADD ADDRESS
    addAddressSuccess(state, action) {
      state.addresses = action.payload;
    },

    // EDIT ADDRESS
    editAddressSuccess(state, action) {
      state.addresses = action.payload;
    }
  }
});

// Reducer
export default slice.reducer;

// ==============================|| SLICE - PRODUCT ACTIONS ||============================== //

export function getProducts() {
  return async () => {
    try {
      const response = await axios.get('/api/products/list');
      dispatch(slice.actions.getProductsSuccess(response.data.products));
    } catch (error) {
      dispatch(slice.actions.hasError(error));
    }
  };
}

export function getProduct(id) {
  return async () => {
    try {
      const response = await axios.post('/api/product/details', { id });
      dispatch(slice.actions.getProductSuccess(response.data));
    } catch (error) {
      dispatch(slice.actions.hasError(error));
    }
  };
}

export function getAddresses() {
  return async () => {
    try {
      const response = await axios.get('/api/address/list');
      dispatch(slice.actions.getAddressesSuccess(response.data.address));
    } catch (error) {
      dispatch(slice.actions.hasError(error));
    }
  };
}

export function addAddress(address) {
  return async () => {
    try {
      const response = await axios.post('/api/address/new', address);
      dispatch(slice.actions.addAddressSuccess(response.data.address));
    } catch (error) {
      dispatch(slice.actions.hasError(error));
    }
  };
}

export function editAddress(address) {
  return async () => {
    try {
      const response = await axios.post('/api/address/edit', address);
      dispatch(slice.actions.editAddressSuccess(response.data.address));
    } catch (error) {
      dispatch(slice.actions.hasError(error));
    }
  };
}
