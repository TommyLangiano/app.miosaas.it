import PropTypes from 'prop-types';

import './../scss/style.scss';

// project imports
import ProviderWrapper from 'store/ProviderWrapper';

export const metadata = {
  title: 'Berry - React Material Admin Dashboard Template by CodedThemes',
  description:
    'Start your next React project with Berry admin template. It build with Reactjs, Material-UI, Redux, and Hook for faster web development.'
};

// ==============================|| ROOT LAYOUT ||============================== //

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ProviderWrapper>{children}</ProviderWrapper>
      </body>
    </html>
  );
}

RootLayout.propTypes = { children: PropTypes.node };
