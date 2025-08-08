'use client';
import PropTypes from 'prop-types';

// next
import dynamic from 'next/dynamic';

// material-ui
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// project imports
import MainCard from 'ui-component/cards/MainCard';

// assets
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

// =========================|| CONVERSIONS CHART CARD ||========================= //

export default function ConversionsChartCard({ chartData }) {
  return (
    <MainCard content={false}>
      <Box sx={{ p: 3 }}>
        <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
          <Typography variant="subtitle1">New Stock</Typography>
          <Typography variant="caption">(Purchased)</Typography>
        </Stack>
        <Stack direction="row" sx={{ alignItems: 'center', gap: 2.5 }}>
          <Typography variant="h4">0.85%</Typography>
          <Stack direction="row" sx={{ alignItems: 'center', gap: 0.5, color: 'info.main' }}>
            <ArrowUpwardIcon color="inherit" sx={{ fontSize: '1.25rem' }} />
            <Typography variant="h4" sx={{ color: 'inherit' }}>
              0.50%
            </Typography>
          </Stack>
        </Stack>
      </Box>
      <Chart {...chartData} />
    </MainCard>
  );
}

ConversionsChartCard.propTypes = { chartData: PropTypes.any };
