import React from 'react';
import { Card, Row, Col, Statistic, Progress, Button, Typography, Space, Tag } from 'antd';
import {
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  WifiOutlined,
  DatabaseOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

const StatusPanel = ({ status, onRefresh }) => {
  const formatUptime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const formatMemory = (bytes) => {
    if (!bytes) return 'N/A';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const getServiceIcon = (serviceStatus) => {
    switch (serviceStatus) {
      case 'running':
      case 'connected':
      case true:
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'stopped':
      case 'disconnected':
      case false:
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      default:
        return <WarningOutlined style={{ color: '#faad14' }} />;
    }
  };

  const getServiceColor = (serviceStatus) => {
    switch (serviceStatus) {
      case 'running':
      case 'connected':
      case true:
        return '#52c41a';
      case 'stopped':
      case 'disconnected':
      case false:
        return '#ff4d4f';
      default:
        return '#faad14';
    }
  };

  const getServiceText = (serviceStatus) => {
    switch (serviceStatus) {
      case 'running':
        return 'Running';
      case 'stopped':
        return 'Stopped';
      case 'connected':
        return 'Connected';
      case 'disconnected':
        return 'Disconnected';
      case true:
        return 'Active';
      case false:
        return 'Inactive';
      default:
        return 'Unknown';
    }
  };

  const overallHealth = status.healthy;
  const healthColor = overallHealth ? '#52c41a' : '#ff4d4f';
  const healthIcon = overallHealth ? <CheckCircleOutlined /> : <CloseCircleOutlined />;

  return (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <DatabaseOutlined style={{ color: '#1890ff' }} />
          <Title level={4} style={{ margin: 0, color: '#ffffff' }}>
            System Status
          </Title>
        </div>
      }
      extra={
        <Button 
          icon={<ReloadOutlined />} 
          onClick={onRefresh}
          type="text"
          style={{ color: '#1890ff' }}
        >
          Refresh
        </Button>
      }
    >
      {/* Overall Health */}
      <Row gutter={[24, 24]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={6}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              fontSize: '48px', 
              color: healthColor, 
              marginBottom: '8px' 
            }}>
              {healthIcon}
            </div>
            <Text style={{ fontSize: '16px', fontWeight: 600 }}>
              System {overallHealth ? 'Healthy' : 'Issues'}
            </Text>
          </div>
        </Col>
        
        <Col xs={24} sm={18}>
          <Row gutter={[16, 16]}>
            <Col xs={12} sm={6}>
              <Statistic
                title={<Text style={{ color: '#8c8c8c' }}>Uptime</Text>}
                value={formatUptime(status.uptime || 0)}
                valueStyle={{ color: '#ffffff', fontSize: '16px' }}
              />
            </Col>
            
            <Col xs={12} sm={6}>
              <Statistic
                title={<Text style={{ color: '#8c8c8c' }}>HLS Segments</Text>}
                value={status.hls?.segmentCount || 0}
                valueStyle={{ color: '#ffffff', fontSize: '16px' }}
              />
            </Col>
            
            <Col xs={12} sm={6}>
              <Statistic
                title={<Text style={{ color: '#8c8c8c' }}>Memory Usage</Text>}
                value={formatMemory(status.memory?.rss)}
                valueStyle={{ color: '#ffffff', fontSize: '16px' }}
              />
            </Col>
            
            <Col xs={12} sm={6}>
              <Statistic
                title={<Text style={{ color: '#8c8c8c' }}>Heap Used</Text>}
                value={formatMemory(status.memory?.heapUsed)}
                valueStyle={{ color: '#ffffff', fontSize: '16px' }}
              />
            </Col>
          </Row>
        </Col>
      </Row>

      {/* Service Status */}
      <Row gutter={[24, 16]}>
        <Col xs={24} sm={8}>
          <Card 
            size="small" 
            style={{ 
              background: '#1a1a1a', 
              border: `1px solid ${getServiceColor(status.ffmpeg)}40`,
              textAlign: 'center'
            }}
          >
            <Space direction="vertical" size="small">
              <div style={{ fontSize: '24px' }}>
                {getServiceIcon(status.ffmpeg)}
              </div>
              <Text style={{ fontSize: '16px', fontWeight: 600 }}>
                FFmpeg
              </Text>
              <Tag color={getServiceColor(status.ffmpeg)} style={{ margin: 0 }}>
                {getServiceText(status.ffmpeg)}
              </Tag>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Video Processing
              </Text>
            </Space>
          </Card>
        </Col>
        
        <Col xs={24} sm={8}>
          <Card 
            size="small" 
            style={{ 
              background: '#1a1a1a', 
              border: `1px solid ${getServiceColor(status.zmq)}40`,
              textAlign: 'center'
            }}
          >
            <Space direction="vertical" size="small">
              <div style={{ fontSize: '24px' }}>
                {getServiceIcon(status.zmq)}
              </div>
              <Text style={{ fontSize: '16px', fontWeight: 600 }}>
                ZeroMQ
              </Text>
              <Tag color={getServiceColor(status.zmq)} style={{ margin: 0 }}>
                {getServiceText(status.zmq)}
              </Tag>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Real-time Control
              </Text>
            </Space>
          </Card>
        </Col>
        
        <Col xs={24} sm={8}>
          <Card 
            size="small" 
            style={{ 
              background: '#1a1a1a', 
              border: `1px solid ${getServiceColor(status.hls?.generating)}40`,
              textAlign: 'center'
            }}
          >
            <Space direction="vertical" size="small">
              <div style={{ fontSize: '24px' }}>
                {getServiceIcon(status.hls?.generating)}
              </div>
              <Text style={{ fontSize: '16px', fontWeight: 600 }}>
                HLS Output
              </Text>
              <Tag color={getServiceColor(status.hls?.generating)} style={{ margin: 0 }}>
                {status.hls?.generating ? 'Generating' : 'Stopped'}
              </Tag>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Stream Segments
              </Text>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* Configuration Info */}
      {status.config && (
        <div style={{ 
          marginTop: '24px', 
          padding: '16px', 
          background: '#1a1a1a', 
          borderRadius: '6px',
          border: '1px solid #303030'
        }}>
          <Title level={5} style={{ margin: '0 0 12px 0', color: '#ffffff' }}>
            Configuration
          </Title>
          <Row gutter={[16, 8]}>
            <Col xs={12} sm={6}>
              <Text type="secondary">Overlay Layers:</Text>
              <br />
              <Text style={{ fontFamily: 'monospace' }}>
                {status.config.layers || 0}
              </Text>
            </Col>
            <Col xs={12} sm={6}>
              <Text type="secondary">Segment Time:</Text>
              <br />
              <Text style={{ fontFamily: 'monospace' }}>
                {status.config.hlsSegmentTime || 0}s
              </Text>
            </Col>
            <Col xs={12} sm={6}>
              <Text type="secondary">Playlist Size:</Text>
              <br />
              <Text style={{ fontFamily: 'monospace' }}>
                {status.config.hlsPlaylistSize || 0}
              </Text>
            </Col>
            <Col xs={12} sm={6}>
              <Text type="secondary">Platform:</Text>
              <br />
              <Text style={{ fontFamily: 'monospace' }}>
                {status.config.platform || 'Browser'}
              </Text>
            </Col>
          </Row>
        </div>
      )}

      {/* System Resources */}
      {status.memory && (
        <div style={{ 
          marginTop: '16px', 
          padding: '16px', 
          background: '#1a1a1a', 
          borderRadius: '6px',
          border: '1px solid #303030'
        }}>
          <Title level={5} style={{ margin: '0 0 12px 0', color: '#ffffff' }}>
            Memory Usage
          </Title>
          
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Text type="secondary">Heap Usage</Text>
              <Progress
                percent={Math.round((status.memory.heapUsed / status.memory.heapTotal) * 100)}
                strokeColor="#1890ff"
                trailColor="#404040"
                format={() => `${formatMemory(status.memory.heapUsed)} / ${formatMemory(status.memory.heapTotal)}`}
              />
            </Col>
            
            <Col xs={24} sm={12}>
              <Text type="secondary">External Memory</Text>
              <div style={{ marginTop: '8px' }}>
                <Text style={{ fontFamily: 'monospace' }}>
                  {formatMemory(status.memory.external)}
                </Text>
              </div>
            </Col>
          </Row>
        </div>
      )}
    </Card>
  );
};

export default StatusPanel;