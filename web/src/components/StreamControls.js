import React, { useState } from 'react';
import { 
  Card, 
  Form, 
  Input, 
  Button, 
  Select, 
  Space, 
  Divider, 
  Typography,
  Row,
  Col,
  InputNumber,
  Slider,
  message
} from 'antd';
import {
  VideoCameraOutlined,
  PictureOutlined,
  FilterOutlined,
  SendOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const StreamControls = ({ onAction, status, onLog }) => {
  const [contentForm] = Form.useForm();
  const [layerForm] = Form.useForm();
  const [filterForm] = Form.useForm();
  const [loading, setLoading] = useState({
    content: false,
    layer: false,
    filter: false
  });

  const handleUpdateContent = async (values) => {
    setLoading({ ...loading, content: true });
    try {
      const result = await onAction('content', values.filePath);
      if (result.success) {
        message.success('Content updated successfully');
        contentForm.resetFields();
      } else {
        message.error(result.message || 'Failed to update content');
      }
    } catch (error) {
      message.error('Failed to update content');
    } finally {
      setLoading({ ...loading, content: false });
    }
  };

  const handleUpdateLayer = async (values) => {
    setLoading({ ...loading, layer: true });
    try {
      const result = await onAction('layer', {
        index: values.layerIndex,
        path: values.filePath
      });
      if (result.success) {
        message.success(`Layer ${values.layerIndex} updated successfully`);
        layerForm.resetFields();
      } else {
        message.error(result.message || 'Failed to update layer');
      }
    } catch (error) {
      message.error('Failed to update layer');
    } finally {
      setLoading({ ...loading, layer: false });
    }
  };

  const handleSendFilter = async (values) => {
    setLoading({ ...loading, filter: true });
    try {
      const result = await onAction('filter', {
        command: values.command
      });
      if (result.success) {
        message.success('Filter command sent successfully');
        // Don't clear the form to allow multiple adjustments
      } else {
        message.error(result.message || 'Failed to send filter command');
      }
    } catch (error) {
      message.error('Failed to send filter command');
    } finally {
      setLoading({ ...loading, filter: false });
    }
  };

  const handleQuickAction = async (command, description) => {
    try {
      onLog('info', `Sending quick action: ${description}`);
      filterForm.setFieldsValue({ command });
      
      const result = await onAction('filter', { command });
      if (result.success) {
        message.success(`${description} applied`);
      } else {
        message.error(result.message || 'Quick action failed');
      }
    } catch (error) {
      message.error('Quick action failed');
    }
  };

  const quickActions = [
    {
      label: 'Move to Top-Left',
      command: 'Parsed_overlay_1 x=10:y=10',
      description: 'Move overlay to top-left corner'
    },
    {
      label: 'Move to Center',
      command: 'Parsed_overlay_1 x=320:y=180',
      description: 'Center the overlay'
    },
    {
      label: 'Move to Bottom-Right',
      command: 'Parsed_overlay_1 x=500:y=350',
      description: 'Move overlay to bottom-right'
    },
    {
      label: '50% Opacity',
      command: 'Parsed_overlay_1 alpha=0.5',
      description: 'Set overlay to 50% opacity'
    },
    {
      label: 'Full Opacity',
      command: 'Parsed_overlay_1 alpha=1.0',
      description: 'Set overlay to full opacity'
    },
    {
      label: 'Hide Overlay',
      command: 'Parsed_overlay_1 alpha=0.0',
      description: 'Hide the overlay completely'
    }
  ];

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* Content Update */}
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <VideoCameraOutlined style={{ color: '#1890ff' }} />
            <Title level={5} style={{ margin: 0, color: '#ffffff' }}>
              Content Update
            </Title>
          </div>
        }
        size="small"
      >
        <Form
          form={contentForm}
          layout="vertical"
          onFinish={handleUpdateContent}
        >
          <Form.Item
            label={<Text style={{ color: '#ffffff' }}>Video File Path</Text>}
            name="filePath"
            rules={[
              { required: true, message: 'Please enter video file path' },
              { min: 1, message: 'Path cannot be empty' }
            ]}
          >
            <Input 
              placeholder="/path/to/your/video.mp4"
              style={{ background: '#262626', border: '1px solid #404040', color: '#ffffff' }}
            />
          </Form.Item>
          
          <Form.Item style={{ marginBottom: 0 }}>
            <Button 
              type="primary" 
              htmlType="submit" 
              icon={<SendOutlined />}
              loading={loading.content}
              disabled={status.ffmpeg !== 'running'}
              block
            >
              Update Content
            </Button>
          </Form.Item>
        </Form>
        
        <div style={{ marginTop: '8px' }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            Updates the main video content without interrupting the stream. 
            Supports MP4, AVI, MOV, and other FFmpeg-compatible formats.
          </Text>
        </div>
      </Card>

      {/* Layer Update */}
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PictureOutlined style={{ color: '#1890ff' }} />
            <Title level={5} style={{ margin: 0, color: '#ffffff' }}>
              Overlay Layer
            </Title>
          </div>
        }
        size="small"
      >
        <Form
          form={layerForm}
          layout="vertical"
          onFinish={handleUpdateLayer}
        >
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label={<Text style={{ color: '#ffffff' }}>Layer</Text>}
                name="layerIndex"
                initialValue={0}
              >
                <Select style={{ background: '#262626' }}>
                  <Option value={0}>Layer 0</Option>
                  <Option value={1}>Layer 1</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item
                label={<Text style={{ color: '#ffffff' }}>Overlay File Path</Text>}
                name="filePath"
                rules={[
                  { required: true, message: 'Please enter overlay file path' }
                ]}
              >
                <Input 
                  placeholder="/path/to/overlay.png"
                  style={{ background: '#262626', border: '1px solid #404040', color: '#ffffff' }}
                />
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item style={{ marginBottom: 0 }}>
            <Button 
              type="primary" 
              htmlType="submit" 
              icon={<SendOutlined />}
              loading={loading.layer}
              disabled={status.ffmpeg !== 'running'}
              block
            >
              Update Layer
            </Button>
          </Form.Item>
        </Form>
        
        <div style={{ marginTop: '8px' }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            Add or update overlay layers (PNG, GIF, video files). 
            Supports transparency and real-time positioning.
          </Text>
        </div>
      </Card>

      {/* Filter Commands */}
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FilterOutlined style={{ color: '#1890ff' }} />
            <Title level={5} style={{ margin: 0, color: '#ffffff' }}>
              Filter Commands
            </Title>
          </div>
        }
        size="small"
      >
        <Form
          form={filterForm}
          layout="vertical"
          onFinish={handleSendFilter}
        >
          <Form.Item
            label={<Text style={{ color: '#ffffff' }}>ZeroMQ Filter Command</Text>}
            name="command"
            rules={[
              { required: true, message: 'Please enter a filter command' }
            ]}
          >
            <TextArea
              placeholder="Parsed_overlay_1 x=200:y=300"
              rows={3}
              style={{ 
                background: '#262626', 
                border: '1px solid #404040', 
                color: '#ffffff',
                fontFamily: 'monospace'
              }}
            />
          </Form.Item>
          
          <Form.Item style={{ marginBottom: 0 }}>
            <Button 
              type="primary" 
              htmlType="submit" 
              icon={<SendOutlined />}
              loading={loading.filter}
              disabled={status.zmq !== 'connected'}
              block
            >
              Send Filter Command
            </Button>
          </Form.Item>
        </Form>
        
        <div style={{ marginTop: '12px' }}>
          <Text style={{ color: '#ffffff', fontSize: '13px', fontWeight: 500 }}>
            Common Commands:
          </Text>
          <div style={{ marginTop: '8px', fontSize: '12px', fontFamily: 'monospace' }}>
            <div style={{ color: '#7dd3fc', marginBottom: '4px' }}>
              • Parsed_overlay_1 x=100:y=200
            </div>
            <div style={{ color: '#a78bfa', marginBottom: '4px' }}>
              • Parsed_overlay_1 alpha=0.8
            </div>
            <div style={{ color: '#fbbf24', marginBottom: '4px' }}>
              • Parsed_drawtext_0 text="Live"
            </div>
            <div style={{ color: '#f87171' }}>
              • Parsed_drawtext_0 fontcolor=red
            </div>
          </div>
        </div>
      </Card>

      {/* Quick Actions */}
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ThunderboltOutlined style={{ color: '#faad14' }} />
            <Title level={5} style={{ margin: 0, color: '#ffffff' }}>
              Quick Actions
            </Title>
          </div>
        }
        size="small"
      >
        <Row gutter={[8, 8]}>
          {quickActions.map((action, index) => (
            <Col xs={24} sm={12} key={index}>
              <Button
                size="small"
                onClick={() => handleQuickAction(action.command, action.description)}
                disabled={status.zmq !== 'connected'}
                style={{ width: '100%', textAlign: 'left' }}
              >
                {action.label}
              </Button>
            </Col>
          ))}
        </Row>
        
        <div style={{ marginTop: '12px' }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            One-click overlay positioning and opacity controls. 
            Requires ZeroMQ connection for real-time updates.
          </Text>
        </div>
      </Card>

      {/* Connection Status */}
      <Card size="small">
        <div style={{ textAlign: 'center' }}>
          <div style={{ marginBottom: '8px' }}>
            <Text type="secondary">Service Status</Text>
          </div>
          <Space>
            <div className={`status-indicator ${status.ffmpeg === 'running' ? 'status-online' : 'status-offline'}`}>
              <span className="status-dot"></span>
              <Text style={{ fontSize: '12px' }}>FFmpeg</Text>
            </div>
            <div className={`status-indicator ${status.zmq === 'connected' ? 'status-online' : 'status-offline'}`}>
              <span className="status-dot"></span>
              <Text style={{ fontSize: '12px' }}>ZeroMQ</Text>
            </div>
            <div className={`status-indicator ${status.hls.generating ? 'status-online' : 'status-offline'}`}>
              <span className="status-dot"></span>
              <Text style={{ fontSize: '12px' }}>HLS</Text>
            </div>
          </Space>
        </div>
      </Card>
    </Space>
  );
};

export default StreamControls;