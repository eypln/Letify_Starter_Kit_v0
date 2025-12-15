'use client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function GroupedBarChart({ data }: { data: { city: string; [bedroom: string]: number | string }[] }) {
  // bedroomKeys: ['1', '2', '3', ...]
  const bedroomKeys = Object.keys(data[0] || {}).filter(k => k !== 'city');
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <XAxis dataKey="city" tick={{ fill: 'currentColor' }} />
        <YAxis tick={{ fill: 'currentColor' }} />
        <Tooltip contentStyle={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)' }} />
        <Legend />
        {bedroomKeys.map((key, idx) => (
          <Bar key={key} dataKey={key} fill={["#6366f1", "#10b981", "#f59e42", "#ef4444", "#3b82f6"][idx % 5]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
