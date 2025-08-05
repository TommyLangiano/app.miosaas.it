'use client';
import PropTypes from 'prop-types';

// yet-another-react-lightbox
import 'yet-another-react-lightbox/styles.css';

// map styles
import 'mapbox-gl/dist/mapbox-gl.css';

// third party
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';

// project imports
import Locales from '../ui-component/Locales';
import NavigationScroll from 'layout/NavigationScroll';
import RTLLayout from '../ui-component/RTLLayout';
import Snackbar from '../ui-component/extended/Snackbar';
import Notistack from '../ui-component/third-party/Notistack';

import ThemeCustomization from 'themes';

import { persister, store } from 'store';
import { ConfigProvider } from '../contexts/ConfigContext';

import { JWTProvider as AuthProvider } from '../contexts/JWTContext';
// import { FirebaseProvider as AuthProvider } from '../../contexts/FirebaseContext';
// import { Auth0Provider as AuthProvider } from '../../contexts/Auth0Context';
// import { AWSCognitoProvider as AuthProvider } from '../contexts/AWSCognitoContext';
// import { SupabaseProvider as AuthProvider } from '../contexts/SupabaseContext';

export default function ProviderWrapper({ children }) {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persister}>
        <ConfigProvider>
          <ThemeCustomization>
            <RTLLayout>
              <Locales>
                <NavigationScroll>
                  <AuthProvider>
                    <Notistack>
                      <Snackbar />
                      {children}
                    </Notistack>
                  </AuthProvider>
                </NavigationScroll>
              </Locales>
            </RTLLayout>
          </ThemeCustomization>
        </ConfigProvider>
      </PersistGate>
    </Provider>
  );
}

ProviderWrapper.propTypes = { children: PropTypes.node };
