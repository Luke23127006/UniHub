import { useCallback, useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { Card, DatePicker, Typography, message, Alert } from 'antd';
import { ClockCircleOutlined, SyncOutlined } from '@ant-design/icons';
import MetricCards from '@/features/admin/components/MetricCards';
import RegistrationsBarChart from '@/features/admin/components/RegistrationsBarChart';
import { getAnalyticsOverview } from '@/features/admin/services/analytics.service';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const DEFAULT_RANGE = [dayjs().subtract(30, 'day'), dayjs()];

function staleness(isoTs) {
  if (!isoTs) return null;
  const diffMin = Math.round((Date.now() - new Date(isoTs).getTime()) / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin === 1) return '1 minute ago';
  if (diffMin < 60) return `${diffMin} minutes ago`;
  const diffHr = Math.round(diffMin / 60);
  return diffHr === 1 ? '1 hour ago' : `${diffHr} hours ago`;
}

export default function AnalyticsDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [workshopStats, setWorkshopStats] = useState([]);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [dateRange, setDateRange] = useState(DEFAULT_RANGE);

  const fetchData = useCallback(async (range) => {
    setLoading(true);
    setFetchError(false);
    try {
      const params = {
        from: range?.[0]?.toISOString(),
        to: range?.[1]?.toISOString(),
      };
      const res = await getAnalyticsOverview(params);
      const { metrics: m, workshopStats: ws, lastRefreshedAt: ts } = res.data.data;
      setMetrics(m);
      setWorkshopStats(ws ?? []);
      setLastRefreshedAt(ts ?? null);
    } catch (err) {
      const serverMsg = err.response?.data?.message;
      message.error(serverMsg ?? 'Failed to load analytics data — is the backend running?');
      setFetchError(true);
      setMetrics(null);
      setWorkshopStats([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(dateRange);
  }, [fetchData, dateRange]);

  const staleLabel = staleness(lastRefreshedAt);

  return (
    <div className="p-6 space-y-6">

      {/* ── Page Header ──────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Title level={4} style={{ margin: 0 }}>Analytics Dashboard</Title>
          {staleLabel && !loading && (
            <Text type="secondary" className="flex items-center gap-1.5 mt-1 text-sm">
              <ClockCircleOutlined />
              Last updated: {staleLabel}
            </Text>
          )}
        </div>

        <div className="flex items-center gap-2">
          <RangePicker
            value={dateRange}
            onChange={(range) => range && setDateRange(range)}
            allowClear={false}
            format="DD/MM/YYYY"
            disabledDate={(d) => d.isAfter(dayjs())}
            presets={[
              { label: 'Last 7 days',  value: [dayjs().subtract(7, 'day'),  dayjs()] },
              { label: 'Last 30 days', value: [dayjs().subtract(30, 'day'), dayjs()] },
              { label: 'Last 90 days', value: [dayjs().subtract(90, 'day'), dayjs()] },
            ]}
          />
        </div>
      </div>

      {/* ── Stale-data warning (only when data is > 15 min old) ──── */}
      {lastRefreshedAt && !loading && (() => {
        const diffMin = (Date.now() - new Date(lastRefreshedAt).getTime()) / 60000;
        return diffMin > 15;
      })() && (
        <Alert
          type="warning"
          showIcon
          icon={<SyncOutlined />}
          message="Statistics may be delayed"
          description={`Data was last aggregated ${staleLabel}. Background jobs refresh every 10 minutes.`}
          closable
        />
      )}

      {/* ── Error banner ─────────────────────────────────────────── */}
      {fetchError && !loading && (
        <Alert
          type="error"
          showIcon
          message="Failed to load analytics"
          description="Could not reach the backend. Displaying empty state — try refreshing the page."
        />
      )}

      {/* ── Metric Cards ─────────────────────────────────────────── */}
      <MetricCards metrics={metrics} loading={loading} />

      {/* ── Bar Chart ────────────────────────────────────────────── */}
      <Card
        title="Registrations per Workshop"
        extra={
          <Text type="secondary" className="text-sm">
            {workshopStats.length > 0 && `${workshopStats.length} workshops`}
          </Text>
        }
      >
        <RegistrationsBarChart data={workshopStats} loading={loading} />
      </Card>

    </div>
  );
}
