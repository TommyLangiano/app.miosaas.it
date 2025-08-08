'use client';

// next
import dynamic from 'next/dynamic';

const OrgChart = dynamic(() => import('views/forms/chart/OrgChart'), { ssr: false });

// ==============================|| PAGE ||============================== //

export default function OrgChartPage() {
  return <OrgChart />;
}
