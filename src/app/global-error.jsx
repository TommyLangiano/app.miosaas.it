'use client';
import PropTypes from 'prop-types';

// project import
import Error500 from 'views/pages/maintenance/Error500';

// ==============================|| ERROR 500 - MAIN ||============================== //

// todo: testing of this page is pending. Need to figure out how to test this. Waiting to see
// if this comes automatically when some error appears

export default function GlobalError({ error, reset }) {
  return (
    <html>
      <body>
        <Error500 />
      </body>
    </html>
  );
}

GlobalError.propTypes = { digest: PropTypes.string };
