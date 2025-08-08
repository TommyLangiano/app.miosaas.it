import { useState, useEffect } from 'react';
import { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';

/**
 * 🔐 Hook per gestire i token JWT di AWS Cognito
 * - Ottiene veri token Cognito (access_token, id_token)
 * - Li salva in localStorage per le chiamate API
 * - Li aggiorna automaticamente
 */
export const useAuthTokens = () => {
  const [tokens, setTokens] = useState({
    accessToken: null,
    idToken: null,
    refreshToken: null
  });
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthState();
    
    // Listen for auth events
    const unsubscribe = Hub.listen('auth', ({ payload }) => {
      console.log('🔐 Auth event:', payload.event);
      switch (payload.event) {
        case 'signedIn':
          checkAuthState();
          break;
        case 'signedOut':
          // Non chiamare clearTokens qui per evitare conflitti
          localStorage.removeItem('cognito_id_token');
          localStorage.removeItem('cognito_access_token');
          localStorage.removeItem('serviceToken');
          break;
        case 'tokenRefresh':
          checkAuthState();
          break;
      }
    });

    return unsubscribe;
  }, []);

  const checkAuthState = async () => {
    try {
      setLoading(true);
      
      // 1. Ottieni utente corrente
      const currentUser = await getCurrentUser();
      console.log('✅ Current user:', currentUser);
      
      // 2. Ottieni sessione con token
      const session = await fetchAuthSession();
      console.log('✅ Auth session obtained');
      
      if (session.tokens) {
        const accessToken = session.tokens.accessToken?.toString();
        const idToken = session.tokens.idToken?.toString();
        const refreshToken = session.tokens.refreshToken?.toString();
        
        console.log('🔑 Tokens extracted:', {
          accessToken: accessToken ? `${accessToken.substring(0, 20)}...` : null,
          idToken: idToken ? `${idToken.substring(0, 20)}...` : null,
          hasRefreshToken: !!refreshToken
        });
        
        // 3. Salva token in stato e localStorage
        const newTokens = {
          accessToken,
          idToken,
          refreshToken
        };
        
        setTokens(newTokens);
        setUser(currentUser);
        setIsAuthenticated(true);
        
        // 4. Salva token per le chiamate API (usa idToken per più informazioni)
        if (idToken) {
          localStorage.setItem('cognito_id_token', idToken);
          localStorage.setItem('cognito_access_token', accessToken);
          console.log('💾 Tokens saved to localStorage');
        }
        
      } else {
        console.log('❌ No tokens in session');
        clearTokens();
      }
      
    } catch (error) {
      console.log('❌ User not authenticated:', error.message);
      clearTokens();
    } finally {
      setLoading(false);
    }
  };

  const clearTokens = () => {
    // Evita aggiornamenti di stato se il componente si sta smontando
    try {
      setTokens({
        accessToken: null,
        idToken: null,
        refreshToken: null
      });
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.log('⚠️ Component unmounting, skipping state updates');
    }
    
    // Pulisci sempre localStorage
    localStorage.removeItem('cognito_id_token');
    localStorage.removeItem('cognito_access_token');
    localStorage.removeItem('serviceToken'); // Rimuovi anche il vecchio token
    console.log('🗑️ Tokens cleared');
  };

  const getAuthHeaders = () => {
    if (tokens.idToken) {
      return {
        'Authorization': `Bearer ${tokens.idToken}`,
        'Content-Type': 'application/json'
      };
    }
    return {};
  };

  const refreshTokens = async () => {
    try {
      console.log('🔄 Refreshing tokens...');
      await checkAuthState();
      return true;
    } catch (error) {
      console.error('❌ Token refresh failed:', error);
      clearTokens();
      return false;
    }
  };

  return {
    // Token data
    tokens,
    user,
    loading,
    isAuthenticated,
    
    // Methods
    checkAuthState,
    clearTokens,
    refreshTokens,
    getAuthHeaders,
    
    // Quick access
    idToken: tokens.idToken,
    accessToken: tokens.accessToken
  };
};

export default useAuthTokens;