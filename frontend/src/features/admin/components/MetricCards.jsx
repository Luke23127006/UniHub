import { Card, Col, Row, Statistic, Skeleton } from 'antd';
import {
  TeamOutlined,
  HomeOutlined,
  RiseOutlined,
  DollarOutlined,
} from '@ant-design/icons';

const CARDS = [
  {
    key: 'totalRegistrations',
    title: 'Total Registrations',
    Icon: TeamOutlined,
    color: '#1677ff',
    suffix: '',
    precision: 0,
    renderValue: (v) => (v ?? 0).toLocaleString(),
  },
  {
    key: 'availableSeats',
    title: 'Available Seats',
    Icon: HomeOutlined,
    color: '#52c41a',
    suffix: '',
    precision: 0,
    renderValue: (v) => (v ?? 0).toLocaleString(),
  },
  {
    key: 'fillRate',
    title: 'Fill Rate',
    Icon: RiseOutlined,
    color: '#faad14',
    suffix: '%',
    precision: 1,
    renderValue: (v) => (v ?? 0).toFixed(1),
  },
  {
    key: 'totalRevenue',
    title: 'Total Revenue',
    Icon: DollarOutlined,
    color: '#722ed1',
    suffix: ' VNĐ',
    precision: 0,
    renderValue: (v) => (v ?? 0).toLocaleString('vi-VN'),
  },
];

export default function MetricCards({ metrics, loading }) {
  return (
    <Row gutter={[16, 16]}>
      {CARDS.map(({ key, title, Icon, color, suffix, renderValue }) => (
        <Col xs={24} sm={12} lg={6} key={key}>
          <Card styles={{ body: { padding: '20px 24px' } }}>
            {loading ? (
              <Skeleton active paragraph={{ rows: 1 }} title={{ width: '50%' }} />
            ) : (
              <div className="flex items-start justify-between gap-4">
                <Statistic
                  title={<span className="text-gray-500 text-sm font-medium">{title}</span>}
                  value={renderValue(metrics?.[key])}
                  suffix={<span className="text-base font-normal text-gray-400">{suffix}</span>}
                  valueStyle={{ color, fontSize: 26, fontWeight: 700, lineHeight: 1.2 }}
                />
                <div
                  className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-xl"
                  style={{ backgroundColor: `${color}18` }}
                >
                  <Icon style={{ fontSize: 22, color }} />
                </div>
              </div>
            )}
          </Card>
        </Col>
      ))}
    </Row>
  );
}
