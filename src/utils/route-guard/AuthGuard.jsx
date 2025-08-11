'use client';
import PropTypes from 'prop-types';

import { useRouter } from 'next/navigation';

import { useEffect } from 'react';

// project imports
import useAuth from '../../hooks/useAuth';
import Loader from '../../ui-component/Loader';

// ==============================|| AUTH GUARD ||============================== //

/**
 * Authentication guard for routes
 * @param {PropTypes.node} children children element/node
 */
export default function AuthGuard({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/');
    }
  }, [loading, isAuthenticated, router]);

  // Evita flicker tra pagine: mostra i children mentre verifichiamo lo stato
  if (loading) return children;
  if (!isAuthenticated) return null;

  return children;
}

AuthGuard.propTypes = { children: PropTypes.any };
