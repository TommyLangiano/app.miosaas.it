'use client';

// next
import dynamic from 'next/dynamic';

const Apexchart = dynamic(() => import('views/forms/chart/Apexchart'), { ssr: false });

// ==============================|| PAGE ||============================== //

export default function ApexchartPage() {
  return <Apexchart />;
}
