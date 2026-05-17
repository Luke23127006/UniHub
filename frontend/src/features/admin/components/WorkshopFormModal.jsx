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
  Select,
  AutoComplete,
} from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import {
  uploadPdfForSummary,
  getPdfJobStatus,
  getRooms,
  getSpeakers
} from '@/features/admin/services/workshopAdmin.service';

const { Dragger } = Upload;

const VND_FORMATTER = {
  formatter: (v) => (v ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''),
  parser: (v) => (v ? Number(v.replace(/,/g, '')) : 0),
};

function toFormValues(workshop) {
  if (!workshop) return {};
  return {
    title: workshop.title,
    speaker: workshop.speaker || workshop.speakers?.[0]?.full_name || '',
    startTime: workshop.start_time ? dayjs(workshop.start_time) : null,
    endTime: workshop.end_time ? dayjs(workshop.end_time) : null,
    roomId: workshop.room?.room_code || workshop.room_id || '',
    totalSeats: workshop.capacity ?? null,
    isFree: !workshop.price,
    amount: workshop.price ?? null,
  };
}

export default function WorkshopFormModal({ open, mode, workshop, submitting, onSubmit, onCancel }) {
  const [form] = Form.useForm();
  const [pdfUploading, setPdfUploading] = useState(false);
  const [fileList, setFileList] = useState([]);
  const [pdfJobId, setPdfJobId] = useState(null);
  const isFree = Form.useWatch('isFree', form);

  const [rooms, setRooms] = useState([]);
  const [speakers, setSpeakers] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFileList([]);
    setPdfJobId(null);
    if (mode === 'edit' && workshop) {
      form.setFieldsValue(toFormValues(workshop));
    } else {
      form.resetFields();
      form.setFieldValue('isFree', true);
    }
  }, [open, mode, workshop, form]);

  useEffect(() => {
    if (!open) return;
    const fetchRoomsAndSpeakers = async () => {
      setLoadingData(true);
      try {
        const [roomsRes, speakersRes] = await Promise.all([
          getRooms(),
          getSpeakers()
        ]);
        setRooms(roomsRes.data.data || []);
        setSpeakers(speakersRes.data.data || []);
      } catch (err) {
        console.error('Failed to fetch rooms/speakers data', err);
        message.error('Failed to load rooms and speakers. Dropdowns may be empty.');
      } finally {
        setLoadingData(false);
      }
    };
    fetchRoomsAndSpeakers();
  }, [open]);

  const handlePdfRequest = async ({ file, onSuccess, onError }) => {
    setPdfUploading(true);
    try {
      const res = await uploadPdfForSummary(file);
      const { jobId } = res.data.data;
      setPdfJobId(jobId);

      // Start polling
      let status = 'pending';
      let pollRes;
      for (let i = 0; i < 30; i++) { // Max 30 attempts = ~60 seconds
        await new Promise(resolve => setTimeout(resolve, 2000));
        pollRes = await getPdfJobStatus(jobId);
        status = pollRes.data.data.status;
        
        if (status === 'completed' || status === 'failed') break;
      }

      if (status === 'completed') {
        const { suggested_title, speaker_name } = pollRes.data.data;
        form.setFieldsValue({ title: suggested_title, speaker: speaker_name });
        message.success('AI extracted workshop details from PDF');
        onSuccess(res.data);
      } else {
        throw new Error('Analysis failed or timed out');
      }
    } catch (err) {
      console.error(err);
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
      pdfJobId: pdfJobId,
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
          <AutoComplete
            placeholder="Type or select a speaker"
            options={speakers.map(s => ({ value: s.full_name, label: `${s.full_name} (${s.organization || 'No Org'})` }))}
            filterOption={(inputValue, option) =>
              option.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
            }
            loading={loadingData}
          />
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
          label="Venue Room"
          rules={[{ required: true, message: 'Room selection is required' }]}
          tooltip="The venue room where the workshop takes place"
        >
          <Select placeholder="Select a room" loading={loadingData}>
            {rooms.map(r => (
              <Select.Option key={r.room_code} value={r.room_code}>
                {r.room_code} - {r.name} (Cap: {r.capacity})
              </Select.Option>
            ))}
          </Select>
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
