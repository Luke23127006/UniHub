import { useCallback, useEffect, useState } from 'react';
import { Table, Button, Popconfirm, Tag, Typography, Space, message, Card } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import dayjs from 'dayjs';
import WorkshopFormModal from '@/features/admin/components/WorkshopFormModal';
import {
  getWorkshops,
  createWorkshop,
  updateWorkshop,
  deleteWorkshop,
} from '@/features/admin/services/workshopAdmin.service';

const { Title, Text } = Typography;

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
}

function PricingTag({ pricing }) {
  if (pricing?.isFree) return <Tag color="green" className="rounded-full px-3">Free</Tag>;
  const amount = pricing?.amount?.toLocaleString('vi-VN') ?? '—';
  return <Tag color="blue" className="rounded-full px-3">{amount} VNĐ</Tag>;
}

// ── Column definitions ─────────────────────────────────────────────────────────

function buildColumns(onEdit, onDelete, deletingId) {
  return [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      width: 240,
      render: (text) => <span className="font-medium dark:text-gray-200">{text}</span>
    },
    {
      title: 'Speaker',
      dataIndex: 'speaker',
      key: 'speaker',
      width: 170,
      render: (text) => <span className="text-gray-600 dark:text-gray-400">{text}</span>
    },
    {
      title: 'Start Time',
      dataIndex: 'start_time',
      key: 'start_time',
      width: 150,
      render: (val, r) => formatDateTime(val || r.startTime),
    },
    {
      title: 'End Time',
      dataIndex: 'end_time',
      key: 'end_time',
      width: 150,
      render: (val, r) => formatDateTime(val || r.endTime),
    },
    {
      title: 'Room',
      dataIndex: ['room', 'room_code'],
      key: 'room',
      width: 140,
      render: (val, r) => (
        <Tag className="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300">
          {val || r.room?.name || r.room_id || '—'}
        </Tag>
      ),
    },
    {
      title: 'Seats',
      key: 'seats',
      width: 140,
      align: 'center',
      render: (_, r) => {
        const capacity = r.capacity ?? r.seats?.total ?? 0;
        const available = r.available_seats ?? r.seats?.available ?? 0;
        const used = capacity - available;
        const percent = capacity > 0 ? (used / capacity) * 100 : 0;

        return (
          <div className="flex flex-col items-center">
            <span className="text-sm font-semibold dark:text-gray-300">{available} / {capacity}</span>
            <div className="w-20 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full mt-1.5 overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, percent)}%` }}
                className={`h-full ${percent > 90 ? 'bg-red-500' : 'bg-blue-500'}`} 
              />
            </div>
          </div>
        );
      },
    },
    {
      title: 'Price',
      key: 'price',
      width: 140,
      render: (_, r) => (
        <PricingTag pricing={{ isFree: !r.price, amount: r.price }} />
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 110,
      render: (_, record) => (
        <Space size="middle">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => onEdit(record)}
            className="text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30"
          />
          <Popconfirm
            title="Delete this workshop?"
            description="All registrations for this workshop will be affected."
            onConfirm={() => onDelete(record.id)}
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true, loading: deletingId === record.id }}
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              className="hover:bg-red-50 dark:hover:bg-red-900/30"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function WorkshopManagement() {
  const [workshops, setWorkshops] = useState([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState('create');
  const [editingWorkshop, setEditingWorkshop] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const fetchWorkshops = useCallback(async () => {
    setTableLoading(true);
    try {
      const res = await getWorkshops();
      setWorkshops(res.data.data.data ?? []);
    } catch {
      message.error('Failed to load workshops. Is the backend running?');
    } finally {
      setTableLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkshops();
  }, [fetchWorkshops]);

  const openCreate = () => {
    setDrawerMode('create');
    setEditingWorkshop(null);
    setDrawerOpen(true);
  };

  const openEdit = (record) => {
    setDrawerMode('edit');
    setEditingWorkshop(record);
    setDrawerOpen(true);
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await deleteWorkshop(id);
      message.success('Workshop deleted');
      setWorkshops((prev) => prev.filter((w) => w.id !== id));
    } catch {
      message.error('Failed to delete workshop');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSubmit = async (payload) => {
    setSubmitting(true);
    try {
      if (drawerMode === 'create') {
        await createWorkshop(payload);
        message.success('Workshop created successfully');
      } else {
        await updateWorkshop(editingWorkshop.id, payload);
        message.success('Workshop updated successfully');
      }
      setDrawerOpen(false);
      fetchWorkshops();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save workshop';
      message.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const columns = buildColumns(openEdit, handleDelete, deletingId);

  const containerVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
  };

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="max-w-7xl mx-auto space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <Title level={2} className="!mb-1 dark:text-gray-100">Workshop Management</Title>
          <Text type="secondary" className="text-base dark:text-gray-400">
            Create, update and manage your events and speakers.
          </Text>
        </div>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            type="primary"
            size="large"
            icon={<PlusOutlined />}
            onClick={openCreate}
            className="rounded-xl h-11 px-6 shadow-lg shadow-blue-500/20"
          >
            New Workshop
          </Button>
        </motion.div>
      </div>

      <Card className="rounded-2xl border-gray-100 dark:border-gray-800 shadow-sm dark:bg-gray-900 overflow-hidden">
        <Table
          rowKey="id"
          columns={columns}
          dataSource={workshops}
          loading={tableLoading}
          scroll={{ x: 1100 }}
          pagination={{
            pageSize: 8,
            showSizeChanger: false,
            className: 'px-4 dark:text-gray-400',
          }}
          className="admin-table dark:admin-table-dark"
        />
      </Card>

      <WorkshopFormModal
        open={drawerOpen}
        mode={drawerMode}
        workshop={editingWorkshop}
        submitting={submitting}
        onSubmit={handleSubmit}
        onCancel={() => setDrawerOpen(false)}
      />
    </motion.div>
  );
}
