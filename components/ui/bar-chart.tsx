'use client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function BarChartComponent({ data }: { data: { city: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <XAxis dataKey="city" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="count" fill="#6366f1" />
      </BarChart>
    </ResponsiveContainer>
  );
}
