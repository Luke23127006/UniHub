import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import {
  Drawer,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Switch,
  Upload,
  Button,
  Spin,
  Divider,
  Space,
  message,
} from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import { uploadPdfForSummary } from '@/features/admin/services/workshopAdmin.service';

const { Dragger } = Upload;

const VND_FORMATTER = {
  formatter: (v) => (v ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''),
  parser: (v) => (v ? Number(v.replace(/,/g, '')) : 0),
};

function toFormValues(workshop) {
  if (!workshop) return {};
  return {
    title: workshop.title,
    speaker: workshop.speaker,
    startTime: workshop.startTime ? dayjs(workshop.startTime) : null,
    endTime: workshop.endTime ? dayjs(workshop.endTime) : null,
    roomId: workshop.room?.name ?? '',
    totalSeats: workshop.seats?.total ?? null,
    isFree: workshop.pricing?.isFree ?? true,
    amount: workshop.pricing?.amount ?? null,
  };
}

export default function WorkshopFormModal({ open, mode, workshop, submitting, onSubmit, onCancel }) {
  const [form] = Form.useForm();
  const [pdfUploading, setPdfUploading] = useState(false);
  const [fileList, setFileList] = useState([]);
  const isFree = Form.useWatch('isFree', form);

  useEffect(() => {
    if (!open) return;
    setFileList([]);
    if (mode === 'edit' && workshop) {
      form.setFieldsValue(toFormValues(workshop));
    } else {
      form.resetFields();
      form.setFieldValue('isFree', true);
    }
  }, [open, mode, workshop, form]);

  const handlePdfRequest = async ({ file, onSuccess, onError }) => {
    setPdfUploading(true);
    try {
      const res = await uploadPdfForSummary(file);
      const { suggestedTitle, speakerName } = res.data.data;
      form.setFieldsValue({ title: suggestedTitle, speaker: speakerName });
      message.success('AI extracted workshop details from PDF');
      onSuccess(res.data);
    } catch {
      message.error('Failed to process PDF — please try again.');
      onError(new Error('Upload failed'));
    } finally {
      setPdfUploading(false);
    }
  };

  const handleFinish = (values) => {
    onSubmit({
      title: values.title,
      speaker: values.speaker,
      startTime: values.startTime?.toISOString(),
      endTime: values.endTime?.toISOString(),
      roomId: values.roomId,
      totalSeats: values.totalSeats,
      pricing: {
        isFree: values.isFree ?? true,
        amount: values.isFree ? 0 : (values.amount ?? 0),
      },
    });
  };

  const endTimeValidator = ({ getFieldValue }) => ({
    validator(_, value) {
      const start = getFieldValue('startTime');
      if (!value || !start || value.isAfter(start)) return Promise.resolve();
      return Promise.reject(new Error('End time must be after start time'));
    },
  });

  return (
    <Drawer
      title={mode === 'create' ? 'Create New Workshop' : 'Edit Workshop'}
      open={open}
      onClose={onCancel}
      width={520}
      footer={
        <Space style={{ justifyContent: 'flex-end', width: '100%' }}>
          <Button onClick={onCancel} disabled={submitting}>Cancel</Button>
          <Button type="primary" loading={submitting} onClick={() => form.submit()}>
            {mode === 'create' ? 'Create Workshop' : 'Save Changes'}
          </Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical" onFinish={handleFinish} requiredMark="optional">
        {/* ── AI PDF Pre-fill ─────────────────────────────────────── */}
        <Form.Item label="AI Auto-fill from PDF (optional)">
          <Spin spinning={pdfUploading} tip="Analysing document…">
            <Dragger
              accept=".pdf"
              maxCount={1}
              fileList={fileList}
              customRequest={handlePdfRequest}
              onChange={({ fileList: fl }) => setFileList(fl)}
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">Click or drag a PDF to auto-fill fields</p>
              <p className="ant-upload-hint">AI will extract the title and speaker name</p>
            </Dragger>
          </Spin>
        </Form.Item>

        <Divider />

        {/* ── Core Details ─────────────────────────────────────────── */}
        <Form.Item
          name="title"
          label="Workshop Title"
          rules={[{ required: true, message: 'Title is required' }]}
        >
          <Input placeholder="e.g. Ứng dụng AI trong học tập" />
        </Form.Item>

        <Form.Item
          name="speaker"
          label="Speaker"
          rules={[{ required: true, message: 'Speaker name is required' }]}
        >
          <Input placeholder="e.g. ThS. Lê Văn B" />
        </Form.Item>

        {/* ── Schedule ─────────────────────────────────────────────── */}
        <Form.Item
          name="startTime"
          label="Start Time"
          rules={[{ required: true, message: 'Start time is required' }]}
        >
          <DatePicker showTime format="DD/MM/YYYY HH:mm" style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item
          name="endTime"
          label="End Time"
          rules={[{ required: true, message: 'End time is required' }, endTimeValidator]}
        >
          <DatePicker showTime format="DD/MM/YYYY HH:mm" style={{ width: '100%' }} />
        </Form.Item>

        {/* ── Venue & Capacity ─────────────────────────────────────── */}
        <Form.Item
          name="roomId"
          label="Room ID"
          rules={[{ required: true, message: 'Room ID is required' }]}
          tooltip="The unique code for the venue room (e.g. room_102)"
        >
          <Input placeholder="e.g. room_102" />
        </Form.Item>

        <Form.Item
          name="totalSeats"
          label="Total Seats"
          rules={[{ required: true, message: 'Total seats is required' }]}
        >
          <InputNumber min={1} max={10000} style={{ width: '100%' }} placeholder="e.g. 60" />
        </Form.Item>

        {/* ── Pricing ──────────────────────────────────────────────── */}
        <Form.Item name="isFree" label="Admission" valuePropName="checked">
          <Switch checkedChildren="Free" unCheckedChildren="Paid" />
        </Form.Item>

        {isFree === false && (
          <Form.Item
            name="amount"
            label="Ticket Price (VNĐ)"
            rules={[{ required: true, message: 'Price is required for paid workshops' }]}
          >
            <InputNumber
              min={0}
              step={10000}
              style={{ width: '100%' }}
              placeholder="e.g. 50000"
              {...VND_FORMATTER}
            />
          </Form.Item>
        )}
      </Form>
    </Drawer>
  );
}
