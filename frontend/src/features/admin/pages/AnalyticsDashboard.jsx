import { useCallback, useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { Card, DatePicker, Typography, message, Alert } from 'antd';
import { ClockCircleOutlined, SyncOutlined } from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
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

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5, staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 }
  };

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="max-w-7xl mx-auto space-y-6"
    >
      {/* ── Page Header ──────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Title level={2} className="!mb-1 dark:text-gray-100">Analytics Overview</Title>
          <Text type="secondary" className="text-base dark:text-gray-400">
            Real-time insights and registration metrics for UniHub workshops.
          </Text>
          {staleLabel && !loading && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-400">
              <ClockCircleOutlined />
              Last updated: {staleLabel}
            </div>
          )}
        </div>

        <motion.div variants={itemVariants} className="bg-white dark:bg-gray-900 p-1.5 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <RangePicker
            value={dateRange}
            onChange={(range) => range && setDateRange(range)}
            allowClear={false}
            variant="borderless"
            format="DD MMM YYYY"
            disabledDate={(d) => d.isAfter(dayjs(), 'day')}
            className="dark:text-gray-200"
            presets={[
              { label: 'Last 7 days',  value: [dayjs().subtract(7, 'day'),  dayjs()] },
              { label: 'Last 30 days', value: [dayjs().subtract(30, 'day'), dayjs()] },
              { label: 'Last 90 days', value: [dayjs().subtract(90, 'day'), dayjs()] },
            ]}
          />
        </motion.div>
      </div>

      <AnimatePresence>
        {lastRefreshedAt && !loading && (() => {
          const diffMin = (Date.now() - new Date(lastRefreshedAt).getTime()) / 60000;
          return diffMin > 15;
        })() && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
            <Alert
              type="warning"
              showIcon
              icon={<SyncOutlined className="animate-spin-slow" />}
              title="Statistics may be delayed"
              description={`Data was last aggregated ${staleLabel}. Background jobs refresh every 10 minutes.`}
              closable
              className="rounded-xl border-amber-100 dark:bg-amber-900/20 dark:border-amber-900/30"
            />
          </motion.div>
        )}

        {fetchError && !loading && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
            <Alert
              type="error"
              showIcon
              title="Failed to load analytics"
              description="Could not reach the backend. Displaying empty state — try refreshing the page."
              className="rounded-xl"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Metric Cards ─────────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <MetricCards metrics={metrics} loading={loading} />
      </motion.div>

      {/* ── Bar Chart ────────────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <Card
          className="rounded-2xl border-gray-100 dark:border-gray-800 shadow-sm dark:bg-gray-900 overflow-hidden"
          title={<span className="dark:text-gray-200">Registrations per Workshop</span>}
          extra={
            <Text type="secondary" className="text-sm dark:text-gray-400">
              {workshopStats.length > 0 && `${workshopStats.length} workshops tracked`}
            </Text>
          }
        >
          <div className="pt-2">
            <RegistrationsBarChart data={workshopStats} loading={loading} />
          </div>
        </Card>
      </motion.div>

    </motion.div>
  );
}
