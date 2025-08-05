'use client';

import { createContext, useEffect, useReducer } from 'react';

// third party
import { CognitoUser, CognitoUserPool, CognitoUserAttribute, AuthenticationDetails } from 'amazon-cognito-identity-js';

// project imports
import Loader from '../../ui-component/Loader';
import accountReducer from '../../store/accountReducer';
import { LOGIN, LOGOUT } from '../../store/actions';

// constant
const initialState = {
  isLoggedIn: false,
  isInitialized: false,
  user: null
};

export const userPool = new CognitoUserPool({
  UserPoolId: process.env.NEXT_PUBLIC_AWS_POOL_ID || '',
  ClientId: process.env.NEXT_PUBLIC_AWS_APP_CLIENT_ID || ''
});

const setSession = (serviceToken) => {
  if (serviceToken) {
    localStorage.setItem('serviceToken', serviceToken);
  } else {
    localStorage.removeItem('serviceToken');
  }
};

// ==============================|| AWS Cognito CONTEXT & PROVIDER ||============================== //

const AWSCognitoContext = createContext(null);

export const AWSCognitoProvider = ({ children }) => {
  const [state, dispatch] = useReducer(accountReducer, initialState);

  useEffect(() => {
    const init = async () => {
      try {
        const serviceToken = window.localStorage.getItem('serviceToken');
        if (serviceToken) {
          setSession(serviceToken);
          dispatch({
            type: LOGIN,
            payload: {
              isLoggedIn: true,
              user: {
                name: 'Betty'
              }
            }
          });
        } else {
          dispatch({
            type: LOGOUT
          });
        }
      } catch (err) {
        console.error(err);
        dispatch({
          type: LOGOUT
        });
      }
    };

    init();
  }, []);

  const login = async (email, password) => {
    const usr = new CognitoUser({
      Username: email,
      Pool: userPool
    });

    const authData = new AuthenticationDetails({
      Username: email,
      Password: password
    });

    usr.authenticateUser(authData, {
      onSuccess: (session) => {
        setSession(session.getAccessToken().getJwtToken());

        dispatch({
          type: LOGIN,
          payload: {
            isLoggedIn: true,
            user: {
              email: authData.getUsername(),
              name: 'Betty'
            }
          }
        });
      },
      onFailure: (_err) => {
        console.log(_err);
      },
      newPasswordRequired: (userAttributes, requiredAttributes) => {
        // // User was signed up by an admin and must provide new
        // // password and required attributes, if any, to complete
        // // authentication.
        // // the api doesn't accept this field back
        // delete userAttributes.email_verified;
        // // unsure about this field, but I don't send this back
        // delete userAttributes.phone_number_verified;
        // // Get these details and call
        // usr.completeNewPasswordChallenge(password, userAttributes, requiredAttributes);
      }
    });
  };

  const register = async (email, password, firstName, lastName) => {
    await new Promise((resolve, reject) => {
      userPool.signUp(
        email,
        password,
        [
          new CognitoUserAttribute({ Name: 'email', Value: email }),
          new CognitoUserAttribute({ Name: 'name', Value: `${firstName} ${lastName}` })
        ],
        [],
        (err) => {
          if (err) {
            reject(err);
            return;
          }
          localStorage.setItem('email', email);
          resolve();
        }
      );
    });
  };

  const logout = () => {
    const loggedInUser = userPool.getCurrentUser();
    if (loggedInUser) {
      setSession(null);
      loggedInUser.signOut();
      dispatch({ type: LOGOUT });
    }
  };

  const forgotPassword = async (email) => {
    const user = new CognitoUser({
      Username: email,
      Pool: userPool
    });
    user.forgotPassword({
      onSuccess: function () {},
      onFailure: function () {}
    });
  };

  const awsResetPassword = async (verificationCode, newPassword) => {
    const email = localStorage.getItem('email');
    if (email) {
      const user = new CognitoUser({
        Username: email,
        Pool: userPool
      });
      return new Promise((resolve, reject) => {
        user.confirmPassword(verificationCode, newPassword, {
          onSuccess: function (data) {
            localStorage.removeItem('email');
            resolve(data);
          },
          onFailure: function (error) {
            reject(error.message);
          }
        });
      });
    } else {
      return new Promise((resolve, reject) => {
        reject('Token expired try again');
      });
    }
  };

  const codeVerification = async (verificationCode) => {
    const email = localStorage.getItem('email');
    if (!email) {
      throw new Error('Username and Pool information are required');
    }

    const user = new CognitoUser({
      Username: email,
      Pool: userPool
    });

    await new Promise((resolve, reject) => {
      user.confirmRegistration(verificationCode, true, (error) => {
        if (error) {
          reject(error.message || JSON.stringify(error));
        } else {
          localStorage.removeItem('email');
          resolve();
        }
      });
    });
  };

  const resendConfirmationCode = async () => {
    const email = localStorage.getItem('email');
    if (!email) {
      throw new Error('Username and Pool information are required');
    }

    const user = new CognitoUser({
      Username: email,
      Pool: userPool
    });

    await new Promise((resolve, reject) => {
      user.resendConfirmationCode((error) => {
        if (error) {
          reject(error.message || JSON.stringify(error));
        } else {
          resolve();
        }
      });
    });
  };

  const updateProfile = () => {};

  if (state.isInitialized !== undefined && !state.isInitialized) {
    return <Loader />;
  }

  return (
    <AWSCognitoContext
      value={{
        ...state,
        login,
        logout,
        register,
        forgotPassword,
        awsResetPassword,
        updateProfile,
        codeVerification,
        resendConfirmationCode
      }}
    >
      {children}
    </AWSCognitoContext>
  );
};

export default AWSCognitoContext;
