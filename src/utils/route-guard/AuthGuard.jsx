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
  const { isLoggedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace('/login');
    }
  }, [isLoggedIn, router]);

  if (!isLoggedIn) return <Loader />;

  return children;
}

AuthGuard.propTypes = { children: PropTypes.any };
