'use client';
import { createContext, useEffect, useReducer } from 'react';

// third party
import { Auth0Client } from '@auth0/auth0-spa-js';

// project imports
import Loader from '../../ui-component/Loader';

import { LOGIN, LOGOUT } from '../../store/actions';
import accountReducer from '../../store/accountReducer';

// constant
let auth0Client;

const initialState = {
  isLoggedIn: false,
  isInitialized: false,
  user: null
};

// ==============================|| AUTH0 CONTEXT & PROVIDER ||============================== //

const Auth0Context = createContext(null);

export const Auth0Provider = ({ children }) => {
  const [state, dispatch] = useReducer(accountReducer, initialState);

  useEffect(() => {
    const init = async () => {
      try {
        auth0Client = new Auth0Client({
          clientId: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID,
          domain: process.env.NEXT_PUBLIC_AUTH0_DOMAIN,
          authorizationParams: {
            redirect_uri: window.location.origin
          }
        });

        await auth0Client.checkSession();
        await auth0Client.getTokenSilently();

        const isLoggedIn = await auth0Client.isAuthenticated();

        if (isLoggedIn) {
          const user = await auth0Client.getUser();

          dispatch({
            type: LOGIN,
            payload: {
              isLoggedIn: true,
              user: {
                id: user?.sub,
                email: user?.email
              }
            }
          });
        } else {
          dispatch({
            type: LOGOUT
          });
        }
      } catch {
        dispatch({
          type: LOGOUT
        });
      }
    };

    init();
  }, []);

  const loginAuth = async (options) => {
    await auth0Client.loginWithPopup(options);
    const isLoggedIn = await auth0Client.isAuthenticated();

    if (isLoggedIn) {
      const user = await auth0Client.getUser();
      dispatch({
        type: LOGIN,
        payload: {
          isLoggedIn: true,
          user: {
            id: user?.sub,
            avatar: user?.picture,
            email: user?.email,
            name: user?.name,
            tier: 'Premium'
          }
        }
      });
    }
  };

  const logout = () => {
    auth0Client.logout();

    dispatch({
      type: LOGOUT
    });
  };

  const resetPassword = async (email) => {};

  const updateProfile = () => {};

  if (state.isInitialized !== undefined && !state.isInitialized) {
    return <Loader />;
  }

  return <Auth0Context value={{ ...state, loginAuth, logout, resetPassword, updateProfile }}>{children}</Auth0Context>;
};

export default Auth0Context;
