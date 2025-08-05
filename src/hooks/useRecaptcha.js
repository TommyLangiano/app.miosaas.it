import { useState, useRef, useCallback, useEffect } from 'react';

// ==============================|| HOOKS - RECAPTCHA ||============================== //

const useRecaptcha = () => {
  const [capchaToken, setCapchaToken] = useState('');
  const recaptchaRef = useRef(null);

  const handleRecaptcha = useCallback((token) => {
    setCapchaToken(token || '');
  }, []);

  useEffect(() => {
    const refreshCaptcha = () => {
      if (recaptchaRef.current && capchaToken) {
        recaptchaRef.current.reset();
        setCapchaToken('');
      }
    };

    let tokenRefreshTimeout = null;

    if (capchaToken) {
      tokenRefreshTimeout = setTimeout(refreshCaptcha, 110000); // 110 seconds
    }

    return () => {
      if (tokenRefreshTimeout) {
        clearTimeout(tokenRefreshTimeout);
      }
    };
  }, [capchaToken]);

  return { capchaToken, setCapchaToken, recaptchaRef, handleRecaptcha };
};

export default useRecaptcha;
