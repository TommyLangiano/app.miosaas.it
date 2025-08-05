'use client';

import { useEffect } from 'react';
import { Amplify } from 'aws-amplify';
import awsConfig from '../aws-exports';

export default function AmplifyProvider({ children }) {
  useEffect(() => {
    try {
      Amplify.configure(awsConfig);
      console.log('✅ Amplify configured successfully');
    } catch (error) {
      console.error('❌ Amplify configuration error:', error);
    }
  }, []);

  return children;
} 