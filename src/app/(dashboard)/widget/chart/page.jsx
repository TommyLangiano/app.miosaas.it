'use client';

// next
import dynamic from 'next/dynamic';

const ChartWidget = dynamic(() => import('views/widget/Chart'), { ssr: false });

// ==============================|| PAGE ||============================== //

export default function ChartWidgetPage() {
  return <ChartWidget />;
}
