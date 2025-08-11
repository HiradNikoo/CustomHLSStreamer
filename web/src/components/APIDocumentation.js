import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Collapse, 
  Typography, 
  Tag, 
  Button, 
  Space, 
  Divider,
  message,
  Row,
  Col,
  Alert
} from 'antd';
import {
  ApiOutlined,
  CopyOutlined,
  PlayCircleOutlined,
  CheckOutlined,
  LinkOutlined
} from '@ant-design/icons';
import { StreamService } from '../services/StreamService';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

const APIDocumentation = ({ onLog }) => {
  const [examples, setExamples] = useState({});
  const [copiedStates, setCopiedStates] = useState({});
  const [testResults, setTestResults] = useState({});

  useEffect(() => {
    const exampleCalls = StreamService.getExampleCalls();
    setExamples(exampleCalls);
  }, []);

  const copyToClipboard = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStates({ ...copiedStates, [key]: true });
      message.success('Copied to clipboard');
      setTimeout(() => {
        setCopiedStates({ ...copiedStates, [key]: false });
      }, 2000);
    } catch (err) {
      message.error('Failed to copy to clipboard');
    }
  };

  const testEndpoint = async (endpointKey) => {
    try {
      onLog('info', `Testing ${endpointKey} endpoint...`);
      let result;

      switch (endpointKey) {
        case 'status':
          result = await StreamService.getStatus();
          break;
        case 'health':
          result = await StreamService.getHealth();
          break;
        case 'updateContent':
          result = await StreamService.updateContent('/test/path/video.mp4');
          break;
        case 'updateLayer':
          result = await StreamService.updateLayer(0, '/test/path/overlay.png');
          break;
        case 'sendFilter':
          result = await StreamService.sendFilterCommand('Parsed_overlay_1 x=100:y=100');
          break;
        default:
          throw new Error('Unknown endpoint');
      }

      setTestResults({ 
        ...testResults, 
        [endpointKey]: { 
          success: true, 
          data: result,
          timestamp: new Date().toLocaleTimeString()
        } 
      });
      
      onLog('info', `${endpointKey} test successful`);
      message.success(`${endpointKey} endpoint test successful`);
      
    } catch (error) {
      setTestResults({ 
        ...testResults, 
        [endpointKey]: { 
          success: false, 
          error: error.message,
          timestamp: new Date().toLocaleTimeString()
        } 
      });
      
      onLog('error', `${endpointKey} test failed: ${error.message}`);
      message.error(`${endpointKey} endpoint test failed`);
    }
  };

  const renderMethodTag = (method) => {
    const colors = {
      'GET': 'green',
      'POST': 'blue',
      'PUT': 'orange',
      'DELETE': 'red'
    };
    return <Tag color={colors[method]} style={{ fontFamily: 'monospace' }}>{method}</Tag>;
  };

  const renderCodeBlock = (code, language = 'javascript') => (
    <div className="code-block">
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  );

  const renderEndpointPanel = (key, endpoint) => {
    const testResult = testResults[key];
    const isCopied = copiedStates[key];

    return (
      <Panel
        header={
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {renderMethodTag(endpoint.method)}
            <Text style={{ fontFamily: 'monospace', fontSize: '14px' }}>
              {endpoint.url.replace('http://localhost:3000', '')}
            </Text>
            {testResult && (
              <Tag color={testResult.success ? 'green' : 'red'} size="small">
                {testResult.success ? 'PASSED' : 'FAILED'}
              </Tag>
            )}
          </div>
        }
        key={key}
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {/* Description */}
          <div>
            <Text style={{ fontSize: '16px', fontWeight: 500 }}>
              {endpoint.description}
            </Text>
          </div>

          {/* Request Body */}
          {endpoint.body && (
            <div>
              <Text style={{ fontSize: '14px', fontWeight: 500 }}>Request Body:</Text>
              {renderCodeBlock(JSON.stringify(endpoint.body, null, 2), 'json')}
            </div>
          )}

          {/* JavaScript Example */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <Text style={{ fontSize: '14px', fontWeight: 500 }}>JavaScript Example:</Text>
              <Space>
                <Button
                  size="small"
                  icon={isCopied ? <CheckOutlined /> : <CopyOutlined />}
                  onClick={() => copyToClipboard(endpoint.example, key)}
                >
                  {isCopied ? 'Copied' : 'Copy'}
                </Button>
                <Button
                  size="small"
                  icon={<PlayCircleOutlined />}
                  onClick={() => testEndpoint(key)}
                  type="primary"
                  ghost
                >
                  Test
                </Button>
              </Space>
            </div>
            {renderCodeBlock(endpoint.example)}
          </div>

          {/* cURL Example */}
          {endpoint.method === 'POST' && endpoint.body && (
            <div>
              <Text style={{ fontSize: '14px', fontWeight: 500 }}>cURL Example:</Text>
              {renderCodeBlock(`curl -X POST ${endpoint.url} \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(endpoint.body)}'`, 'bash')}
            </div>
          )}

          {endpoint.method === 'GET' && (
            <div>
              <Text style={{ fontSize: '14px', fontWeight: 500 }}>cURL Example:</Text>
              {renderCodeBlock(`curl ${endpoint.url}`, 'bash')}
            </div>
          )}

          {/* Test Results */}
          {testResult && (
            <div>
              <Text style={{ fontSize: '14px', fontWeight: 500 }}>
                Test Result ({testResult.timestamp}):
              </Text>
              {testResult.success ? (
                <Alert
                  message="Test Successful"
                  description={
                    <div className="code-block" style={{ marginTop: '8px' }}>
                      <pre>
                        <code>{JSON.stringify(testResult.data, null, 2)}</code>
                      </pre>
                    </div>
                  }
                  type="success"
                  showIcon
                />
              ) : (
                <Alert
                  message="Test Failed"
                  description={testResult.error}
                  type="error"
                  showIcon
                />
              )}
            </div>
          )}
        </Space>
      </Panel>
    );
  };

  return (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <ApiOutlined style={{ color: '#1890ff' }} />
          <Title level={4} style={{ margin: 0, color: '#ffffff' }}>
            API Documentation
          </Title>
        </div>
      }
      extra={
        <Button 
          type="text" 
          icon={<LinkOutlined />}
          style={{ color: '#1890ff' }}
          onClick={() => window.open('/api/info', '_blank')}
        >
          Full API
        </Button>
      }
    >
      {/* API Overview */}
      <div style={{ marginBottom: '24px' }}>
        <Alert
          message="RESTful API for Stream Control"
          description={
            <div>
              <Text>
                Control your HLS stream in real-time using HTTP requests. 
                All endpoints return JSON responses with success status and descriptive messages.
              </Text>
              <Divider style={{ margin: '12px 0' }} />
              <Row gutter={[16, 8]}>
                <Col xs={24} sm={8}>
                  <Text type="secondary">Base URL:</Text>
                  <br />
                  <Text code>{window.location.origin}</Text>
                </Col>
                <Col xs={24} sm={8}>
                  <Text type="secondary">Content-Type:</Text>
                  <br />
                  <Text code>application/json</Text>
                </Col>
                <Col xs={24} sm={8}>
                  <Text type="secondary">Rate Limit:</Text>
                  <br />
                  <Text code>30 req/min</Text>
                </Col>
              </Row>
            </div>
          }
          type="info"
          showIcon
          style={{ marginBottom: '16px' }}
        />
      </div>

      {/* API Endpoints */}
      <Collapse ghost>
        {Object.entries(examples).map(([key, endpoint]) => 
          renderEndpointPanel(key, endpoint)
        )}
      </Collapse>

      {/* Advanced Examples */}
      <div style={{ marginTop: '24px' }}>
        <Title level={5} style={{ color: '#ffffff' }}>
          Advanced Usage Examples
        </Title>

        <Collapse ghost>
          <Panel header="Batch Operations" key="batch">
            <div>
              <Text style={{ fontSize: '14px', fontWeight: 500 }}>
                Update Multiple Elements:
              </Text>
              {renderCodeBlock(`// Update content, then overlay, then apply filter
async function updateStream() {
  try {
    // Update main content
    await fetch('/api/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'content',
        data: '/media/news-intro.mp4'
      })
    });
    
    // Add logo overlay
    await fetch('/api/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'layer',
        data: { index: 0, path: '/media/logo.png' }
      })
    });
    
    // Position logo in corner
    await fetch('/api/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'filter',
        data: { command: 'Parsed_overlay_1 x=10:y=10' }
      })
    });
    
    console.log('Stream updated successfully');
  } catch (error) {
    console.error('Stream update failed:', error);
  }
}`)}
            </div>
          </Panel>

          <Panel header="Real-time Animations" key="animations">
            <div>
              <Text style={{ fontSize: '14px', fontWeight: 500 }}>
                Animate Overlay Position:
              </Text>
              {renderCodeBlock(`// Animate overlay across screen
async function animateOverlay() {
  for (let x = 0; x <= 500; x += 10) {
    await fetch('/api/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'filter',
        data: { command: \`Parsed_overlay_1 x=\${x}:y=100\` }
      })
    });
    
    // Wait 100ms between updates
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}`)}
            </div>
          </Panel>

          <Panel header="Error Handling" key="errors">
            <div>
              <Text style={{ fontSize: '14px', fontWeight: 500 }}>
                Robust Error Handling:
              </Text>
              {renderCodeBlock(`async function safeStreamUpdate(type, data) {
  try {
    const response = await fetch('/api/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, data })
    });
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.message || 'Update failed');
    }
    
    return result;
    
  } catch (error) {
    if (error.name === 'TypeError') {
      console.error('Network error - server unreachable');
    } else if (error.message.includes('validation')) {
      console.error('Invalid input data');
    } else {
      console.error('Update failed:', error.message);
    }
    
    throw error;
  }
}`)}
            </div>
          </Panel>
        </Collapse>
      </div>

      {/* Response Formats */}
      <div style={{ marginTop: '24px' }}>
        <Title level={5} style={{ color: '#ffffff' }}>
          Response Formats
        </Title>
        
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <div>
              <Text style={{ fontSize: '14px', fontWeight: 500, color: '#52c41a' }}>
                Success Response:
              </Text>
              {renderCodeBlock(`{
  "success": true,
  "message": "Content updated successfully",
  "timestamp": "2024-01-15T10:30:00.000Z"
}`, 'json')}
            </div>
          </Col>
          
          <Col xs={24} lg={12}>
            <div>
              <Text style={{ fontSize: '14px', fontWeight: 500, color: '#ff4d4f' }}>
                Error Response:
              </Text>
              {renderCodeBlock(`{
  "success": false,
  "message": "File not found: /invalid/path.mp4",
  "error": "ENOENT",
  "timestamp": "2024-01-15T10:30:00.000Z"
}`, 'json')}
            </div>
          </Col>
        </Row>
      </div>
    </Card>
  );
};

export default APIDocumentation;