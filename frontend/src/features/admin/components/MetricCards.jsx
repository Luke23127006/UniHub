import { Card, Col, Row, Statistic, Skeleton } from 'antd';
import {
  TeamOutlined,
  HomeOutlined,
  RiseOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';

const CARDS = [
  {
    key: 'totalRegistrations',
    title: 'Total Registrations',
    Icon: TeamOutlined,
    color: '#1677ff',
    suffix: '',
    renderValue: (v) => (v ?? 0).toLocaleString(),
  },
  {
    key: 'availableSeats',
    title: 'Available Seats',
    Icon: HomeOutlined,
    color: '#52c41a',
    suffix: '',
    renderValue: (v) => (v ?? 0).toLocaleString(),
  },
  {
    key: 'fillRate',
    title: 'Fill Rate',
    Icon: RiseOutlined,
    color: '#faad14',
    suffix: '%',
    renderValue: (v) => (v ?? 0).toFixed(1),
  },
  {
    key: 'totalRevenue',
    title: 'Total Revenue',
    Icon: DollarOutlined,
    color: '#722ed1',
    suffix: ' VNĐ',
    renderValue: (v) => (v ?? 0).toLocaleString('vi-VN'),
  },
];

export default function MetricCards({ metrics, loading }) {
  return (
    <Row gutter={[16, 16]}>
      {CARDS.map(({ key, title, Icon, color, suffix, renderValue }, index) => (
        <Col xs={24} sm={12} lg={6} key={key}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ y: -4 }}
          >
            <Card 
              className="relative rounded-2xl border-gray-100 dark:border-gray-800 shadow-sm dark:bg-gray-900/40 backdrop-blur-md overflow-hidden hover:shadow-lg transition-all duration-300 scanline-effect"
              styles={{ body: { padding: '20px 24px' } }}
            >
              {loading ? (
                <Skeleton active paragraph={{ rows: 1 }} title={{ width: '50%' }} />
              ) : (
                <div className="flex items-start justify-between gap-4">
                  <Statistic
                    title={<span className="text-gray-500 dark:text-gray-400 text-sm font-medium tracking-wider uppercase">{title}</span>}
                    value={renderValue(metrics?.[key])}
                    suffix={<span className="text-base font-normal text-gray-400 dark:text-gray-500 ml-1">{suffix}</span>}
                    styles={{ content: { color, fontSize: 26, fontWeight: 700, lineHeight: 1.2 } }}
                  />
                  <div className="relative group">
                    <div 
                      className="absolute inset-0 rounded-xl opacity-20 group-hover:opacity-40 transition-opacity animate-pulse"
                      style={{ backgroundColor: color, filter: 'blur(10px)' }}
                    />
                    <div
                      className="relative flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-xl border border-white/10"
                      style={{ backgroundColor: `${color}20` }}
                    >
                      <Icon style={{ fontSize: 22, color }} />
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </motion.div>
        </Col>
      ))}
    </Row>
  );
}
