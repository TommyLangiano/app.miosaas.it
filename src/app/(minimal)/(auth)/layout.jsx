import PropTypes from 'prop-types';
// project imports
import MinimalLayout from 'layout/MinimalLayout';
import GuestGuard from 'utils/route-guard/GuestGuard';

// ================================|| SIMPLE LAYOUT ||================================ //

export default function Layout({ children }) {
  return (
    <GuestGuard>
      <MinimalLayout>{children}</MinimalLayout>
    </GuestGuard>
  );
}

Layout.propTypes = { children: PropTypes.node };
