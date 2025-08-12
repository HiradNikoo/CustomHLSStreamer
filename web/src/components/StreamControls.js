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
  message,
  Tag
} from 'antd';
import {
  VideoCameraOutlined,
  PictureOutlined,
  FilterOutlined,
  SendOutlined,
  ThunderboltOutlined,
  FileOutlined,
  PlaySquareOutlined,
  PlusOutlined,
  DeleteOutlined,
  MinusCircleOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const StreamControls = ({ onAction, status, onLog }) => {
  const [contentForm] = Form.useForm();
  const [layerForm] = Form.useForm();
  const [filterForm] = Form.useForm();
  const [backgroundForm] = Form.useForm();
  const [loading, setLoading] = useState({
    content: false,
    layer: false,
    filter: false,
    background: false
  });

  // Dynamic layer management
  const [activeLayers, setActiveLayers] = useState([]);
  const [availableLayers] = useState(Array.from({ length: 10 }, (_, i) => i)); // Support up to 10 layers

  // Sample files available for selection
  const sampleVideoFiles = [
    { name: 'Video 1', path: './samples/video1.mp4', description: 'Sample video file 1', type: 'video' },
    { name: 'Video 2', path: './samples/video2.mp4', description: 'Sample video file 2', type: 'video' }
  ];

  const sampleOverlayFiles = [
    { name: 'Watermark PNG', path: './samples/watermark.png', description: 'PNG watermark overlay', type: 'image' },
    { name: 'Video 1 (as overlay)', path: './samples/video1.mp4', description: 'Video file as overlay layer', type: 'video' },
    { name: 'Video 2 (as overlay)', path: './samples/video2.mp4', description: 'Video file as overlay layer', type: 'video' }
  ];

  // Helper function to set file path in form
  const selectSampleFile = (formInstance, fieldName, filePath) => {
    formInstance.setFieldsValue({ [fieldName]: filePath });
  };

  // Get file type icon
  const getFileTypeIcon = (type) => {
    switch (type) {
      case 'video': return <PlaySquareOutlined />;
      case 'image': return <PictureOutlined />;
      default: return <FileOutlined />;
    }
  };

  // Get next available layer index
  const getNextLayerIndex = () => {
    for (let i = 0; i < availableLayers.length; i++) {
      if (!activeLayers.includes(i)) {
        return i;
      }
    }
    return null;
  };

  // Add a new layer
  const addLayer = () => {
    const nextIndex = getNextLayerIndex();
    if (nextIndex !== null) {
      setActiveLayers([...activeLayers, nextIndex]);
    }
  };

  // Remove a layer
  const removeLayer = (layerIndex) => {
    setActiveLayers(activeLayers.filter(index => index !== layerIndex));
  };

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

  const handleUpdateBackground = async (values) => {
    setLoading({ ...loading, background: true });
    try {
      const result = await onAction('background', values);
      if (result.success) {
        message.success('Background updated successfully');
        backgroundForm.resetFields();
      } else {
        message.error(result.message || 'Failed to update background');
      }
    } catch (error) {
      message.error('Failed to update background');
    } finally {
      setLoading({ ...loading, background: false });
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
      {/* Background Settings */}
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <VideoCameraOutlined style={{ color: '#1890ff' }} />
            <Title level={5} style={{ margin: 0, color: '#ffffff' }}>
              Background Layer
            </Title>
          </div>
        }
        size="small"
      >
        <Form
          form={backgroundForm}
          layout="vertical"
          onFinish={handleUpdateBackground}
        >
          <Form.Item
            label={<Text style={{ color: '#ffffff' }}>Color</Text>}
            name="color"
          >
            <Input
              placeholder="e.g., black or #000000"
              style={{ background: '#262626', border: '1px solid #404040', color: '#ffffff' }}
            />
          </Form.Item>
          <Form.Item
            label={<Text style={{ color: '#ffffff' }}>Text</Text>}
            name="text"
          >
            <Input
              placeholder="Optional text"
              style={{ background: '#262626', border: '1px solid #404040', color: '#ffffff' }}
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SendOutlined />}
              loading={loading.background}
              disabled={status.ffmpeg !== 'running'}
              block
            >
              Update Background
            </Button>
          </Form.Item>
        </Form>

        <div style={{ marginTop: '8px' }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            Sets the persistent background color and optional text.
          </Text>
        </div>
      </Card>

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

          {/* Sample Video File Selection */}
          <div style={{ marginBottom: '16px' }}>
            <Text style={{ color: '#ffffff', fontSize: '13px', fontWeight: 500, marginBottom: '8px', display: 'block' }}>
              <FileOutlined style={{ marginRight: '6px', color: '#1890ff' }} />
              Sample Video Files:
            </Text>
            <Space wrap>
              {sampleVideoFiles.map((file, index) => (
                <Button
                  key={index}
                  size="small"
                  icon={<PlaySquareOutlined />}
                  onClick={() => selectSampleFile(contentForm, 'filePath', file.path)}
                  style={{ 
                    background: '#1a1a1a',
                    border: '1px solid #1890ff40',
                    color: '#1890ff'
                  }}
                >
                  {file.name}
                </Button>
              ))}
            </Space>
          </div>
          
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

      {/* Dynamic Overlay Layers */}
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PictureOutlined style={{ color: '#1890ff' }} />
              <Title level={5} style={{ margin: 0, color: '#ffffff' }}>
                Overlay Layers
              </Title>
              <Tag color="blue" style={{ margin: 0 }}>{activeLayers.length}</Tag>
            </div>
            <Button
              size="small"
              type="primary"
              icon={<PlusOutlined />}
              onClick={addLayer}
              disabled={getNextLayerIndex() === null}
            >
              Add Layer
            </Button>
          </div>
        }
        size="small"
      >
        {/* Sample Overlay Files */}
        <div style={{ marginBottom: activeLayers.length > 0 ? '20px' : '16px' }}>
          <Text style={{ color: '#ffffff', fontSize: '13px', fontWeight: 500, marginBottom: '8px', display: 'block' }}>
            <FileOutlined style={{ marginRight: '6px', color: '#1890ff' }} />
            Sample Files (click to use):
          </Text>
          <Space wrap>
            {sampleOverlayFiles.map((file, index) => (
              <Button
                key={index}
                size="small"
                icon={getFileTypeIcon(file.type)}
                onClick={() => {
                  if (activeLayers.length === 0) {
                    addLayer();
                  }
                  // Wait a moment for state to update, then set the file
                  setTimeout(() => {
                    const layerIndex = activeLayers.length > 0 ? activeLayers[activeLayers.length - 1] : 0;
                    document.querySelector(`input[name="layer-${layerIndex}-filePath"]`)?.focus();
                    document.querySelector(`input[name="layer-${layerIndex}-filePath"]`)?.setAttribute('value', file.path);
                  }, 100);
                }}
                style={{ 
                  background: '#1a1a1a',
                  border: `1px solid ${file.type === 'video' ? '#52c41a40' : '#faad1440'}`,
                  color: file.type === 'video' ? '#52c41a' : '#faad14'
                }}
              >
                {file.name}
              </Button>
            ))}
          </Space>
        </div>

        {/* Active Layers */}
        {activeLayers.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px 20px',
            border: '2px dashed #404040',
            borderRadius: '8px',
            background: '#1a1a1a'
          }}>
            <PictureOutlined style={{ fontSize: '24px', color: '#8c8c8c', marginBottom: '8px' }} />
            <br />
            <Text style={{ color: '#8c8c8c' }}>No overlay layers configured</Text>
            <br />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Click "Add Layer" or select a sample file to get started
            </Text>
          </div>
        ) : (
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            {activeLayers.map((layerIndex) => (
              <Card 
                key={layerIndex}
                size="small"
                style={{ 
                  background: '#1a1a1a', 
                  border: '1px solid #303030'
                }}
                title={
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ color: '#ffffff', fontSize: '14px' }}>
                      Layer {layerIndex}
                    </Text>
                    <Button
                      size="small"
                      type="text"
                      danger
                      icon={<MinusCircleOutlined />}
                      onClick={() => removeLayer(layerIndex)}
                    >
                      Remove
                    </Button>
                  </div>
                }
              >
                <Form
                  layout="vertical"
                  onFinish={(values) => handleUpdateLayer({ ...values, layerIndex })}
                  style={{ marginBottom: 0 }}
                >
                  <Form.Item
                    label={<Text style={{ color: '#ffffff', fontSize: '12px' }}>File Path</Text>}
                    name={`layer-${layerIndex}-filePath`}
                    rules={[
                      { required: true, message: 'Please enter file path' }
                    ]}
                    style={{ marginBottom: '12px' }}
                  >
                    <Input 
                      name={`layer-${layerIndex}-filePath`}
                      placeholder="/path/to/overlay.png (or .mp4, .gif, etc.)"
                      style={{ 
                        background: '#262626', 
                        border: '1px solid #404040', 
                        color: '#ffffff',
                        fontSize: '12px'
                      }}
                    />
                  </Form.Item>
                  
                  <Button 
                    type="primary" 
                    htmlType="submit" 
                    icon={<SendOutlined />}
                    loading={loading.layer}
                    disabled={status.ffmpeg !== 'running'}
                    size="small"
                    block
                  >
                    Update Layer {layerIndex}
                  </Button>
                </Form>
              </Card>
            ))}
          </Space>
        )}
        
        <div style={{ marginTop: '12px' }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            Supports videos (.mp4, .avi, .mov), images (.png, .jpg, .gif), and any FFmpeg-compatible format. 
            Videos can be looped as overlay layers with transparency support.
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