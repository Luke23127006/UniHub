import { useCallback, useEffect, useState } from 'react';
import { Table, Button, Popconfirm, Tag, Typography, Space, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import WorkshopFormModal from '@/features/admin/components/WorkshopFormModal';
import {
  getWorkshops,
  createWorkshop,
  updateWorkshop,
  deleteWorkshop,
} from '@/features/admin/services/workshopAdmin.service';

const { Title } = Typography;

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
}

function PricingTag({ pricing }) {
  if (pricing?.isFree) return <Tag color="green">Free</Tag>;
  const amount = pricing?.amount?.toLocaleString('vi-VN') ?? '—';
  return <Tag color="blue">{amount} VNĐ</Tag>;
}

// ── Column definitions ─────────────────────────────────────────────────────────

function buildColumns(onEdit, onDelete, deletingId) {
  return [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      width: 220,
    },
    {
      title: 'Speaker',
      dataIndex: 'speaker',
      key: 'speaker',
      width: 170,
    },
    {
      title: 'Start Time',
      dataIndex: 'startTime',
      key: 'startTime',
      width: 150,
      render: formatDateTime,
    },
    {
      title: 'End Time',
      dataIndex: 'endTime',
      key: 'endTime',
      width: 150,
      render: formatDateTime,
    },
    {
      title: 'Room',
      dataIndex: ['room', 'name'],
      key: 'room',
      width: 160,
      render: (val) => val ?? '—',
    },
    {
      title: 'Seats',
      key: 'seats',
      width: 90,
      align: 'center',
      render: (_, r) => `${r.seats?.available ?? '—'} / ${r.seats?.total ?? '—'}`,
    },
    {
      title: 'Pricing',
      key: 'pricing',
      width: 120,
      render: (_, r) => <PricingTag pricing={r.pricing} />,
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 110,
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => onEdit(record)}
            title="Edit"
          />
          <Popconfirm
            title="Delete this workshop?"
            description="This action cannot be undone."
            onConfirm={() => onDelete(record.id)}
            okText="Delete"
            okButtonProps={{ danger: true }}
            cancelText="Cancel"
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              loading={deletingId === record.id}
              title="Delete"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];
}

// ── Page component ─────────────────────────────────────────────────────────────

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
      setWorkshops(res.data.data ?? []);
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
      const serverMsg = err.response?.data?.error?.message;
      message.error(serverMsg ?? 'Operation failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = buildColumns(openEdit, handleDelete, deletingId);

  return (
    <div className="p-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <Title level={4} style={{ margin: 0 }}>Workshop Management</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Create New
        </Button>
      </div>

      {/* ── Table ── */}
      <Table
        rowKey="id"
        columns={columns}
        dataSource={workshops}
        loading={tableLoading}
        scroll={{ x: 1100 }}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `${total} workshop${total !== 1 ? 's' : ''}`,
        }}
      />

      {/* ── Create / Edit Drawer ── */}
      <WorkshopFormModal
        open={drawerOpen}
        mode={drawerMode}
        workshop={editingWorkshop}
        submitting={submitting}
        onSubmit={handleSubmit}
        onCancel={() => setDrawerOpen(false)}
      />
    </div>
  );
}
