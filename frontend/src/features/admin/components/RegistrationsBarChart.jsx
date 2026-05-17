import { Empty, Spin } from 'antd';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const BAR_COLOR = '#1677ff';
const MAX_TITLE_LEN = 22;

function truncate(str) {
  return str?.length > MAX_TITLE_LEN ? `${str.slice(0, MAX_TITLE_LEN)}…` : (str ?? '');
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3 text-sm">
      <p className="font-medium text-gray-700 mb-1">{label}</p>
      <p style={{ color: BAR_COLOR }} className="font-semibold">
        {payload[0].value?.toLocaleString()} registrations
      </p>
    </div>
  );
}

export default function RegistrationsBarChart({ data = [], loading }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spin size="large" description="Loading chart…" />
      </div>
    );
  }

  if (!data.length) {
    return <Empty description="No registration data for this period" className="py-16" />;
  }

  const chartData = data.map((item) => ({
    ...item,
    label: truncate(item.title),
  }));

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 70 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 12, fill: '#8c8c8c' }}
          tickLine={false}
          angle={-38}
          textAnchor="end"
          interval={0}
        />
        <YAxis
          tick={{ fontSize: 12, fill: '#8c8c8c' }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
          width={40}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: `${BAR_COLOR}10` }} />
        <Bar
          dataKey="registrations"
          fill={BAR_COLOR}
          radius={[4, 4, 0, 0]}
          maxBarSize={52}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
