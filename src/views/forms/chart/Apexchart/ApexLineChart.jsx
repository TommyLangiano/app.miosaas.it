'use client';
import { useEffect, useState } from 'react';

// next
import dynamic from 'next/dynamic';

// material-ui
import { useTheme } from '@mui/material/styles';

// project imports
import useConfig from 'hooks/useConfig';

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

// chart options
const lineChartOptions = {
  chart: {
    height: 350,
    type: 'line',
    zoom: {
      enabled: false
    }
  },
  dataLabels: {
    enabled: false
  },
  stroke: {
    curve: 'straight'
  },
  xaxis: {
    categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep']
  }
};

// ==============================|| LINE CHART ||============================== //

export default function ApexLineChart() {
  const theme = useTheme();
  const { mode } = useConfig();

  const { primary } = theme.palette.text;
  const divider = theme.palette.divider;
  const secondary = theme.palette.secondary.main;

  const [series] = useState([
    {
      name: 'Desktops',
      data: [10, 41, 35, 51, 49, 62, 69, 91, 148]
    }
  ]);

  const [options, setOptions] = useState(lineChartOptions);

  useEffect(() => {
    setOptions((prevState) => ({
      ...prevState,
      colors: [secondary],
      xaxis: {
        ...prevState.xaxis,
        labels: { style: { colors: primary } }
      },
      yaxis: { labels: { style: { colors: primary } } },
      grid: { borderColor: divider },
      tooltip: { theme: mode }
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, theme.palette]);

  return (
    <div id="chart">
      <ReactApexChart options={options} series={series} type="line" height={350} />
    </div>
  );
}
