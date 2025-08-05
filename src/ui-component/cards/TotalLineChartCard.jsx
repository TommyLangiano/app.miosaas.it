'use client';
import PropTypes from 'prop-types';

// next
import dynamic from 'next/dynamic';

// material-ui
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

// ============================|| TOTAL LINE CHART CARD ||============================ //

export default function TotalLineChartCard({ bgColor, chartData, title, percentage, value }) {
  return (
    <Card>
      <Box sx={{ color: 'common.white', bgcolor: bgColor || 'primary.dark' }}>
        <Box sx={{ p: 2.5 }}>
          <Grid container direction="column">
            <Grid container sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
              {value && (
                <Grid>
                  <Typography variant="h3" color="inherit">
                    {value}
                  </Typography>
                </Grid>
              )}
              {percentage && (
                <Grid>
                  <Typography variant="body2" color="inherit">
                    {percentage}
                  </Typography>
                </Grid>
              )}
            </Grid>
            {title && (
              <Grid>
                <Typography variant="body2" color="inherit">
                  {title}
                </Typography>
              </Grid>
            )}
          </Grid>
        </Box>
        {chartData && <Chart {...chartData} />}
      </Box>
    </Card>
  );
}

TotalLineChartCard.propTypes = {
  bgColor: PropTypes.string,
  chartData: PropTypes.any,
  title: PropTypes.string,
  percentage: PropTypes.string,
  value: PropTypes.number
};
