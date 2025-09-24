'use client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function HistogramBarChart({ data }: { data: { range: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <XAxis dataKey="range" />
        <YAxis />
        <Tooltip />
  <Bar dataKey="count" fill="#10b981" />
      </BarChart>
    </ResponsiveContainer>
  );
}
