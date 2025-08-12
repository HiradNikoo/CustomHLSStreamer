import React, { useState, useRef, useEffect } from 'react';
import {
  Card,
  Typography,
  Button,
  Space,
  Select,
  Input,
  Badge,
  Tooltip,
  Spin
} from 'antd';
import {
  SendOutlined,
  ClearOutlined,
  DownloadOutlined,
  SearchOutlined,
  FilterOutlined,
  PauseOutlined,
  PlayCircleOutlined,
  DisconnectOutlined,
  LinkOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;
const { Search } = Input;

const ZmqLogs = () => {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [selectedType, setSelectedType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const logContainerRef = useRef(null);
  const eventSourceRef = useRef(null);

  useEffect(() => {
    let filtered = logs;
    if (selectedType !== 'all') {
      filtered = filtered.filter(log => log.type === selectedType);
    }
    if (searchTerm) {
      filtered = filtered.filter(log =>
        log.message.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    setFilteredLogs(filtered);
  }, [logs, selectedType, searchTerm]);

  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [filteredLogs, autoScroll]);

  const connectToStream = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    setIsLoading(true);
    const eventSource = new EventSource('/api/zmq/logs/stream');
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      setIsLoading(false);
    };

    eventSource.onmessage = (event) => {
      if (isPaused) return;
      try {
        const logEntry = JSON.parse(event.data);
        if (logEntry.type === 'heartbeat' || logEntry.type === 'connected') {
          return;
        }
        setLogs(prev => [...prev, logEntry]);
      } catch (error) {
        console.error('Error parsing ZMQ log entry:', error);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      setIsLoading(false);
    };
  };

  const disconnectFromStream = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsConnected(false);
    setIsLoading(false);
  };

  const loadInitialLogs = async () => {
    try {
      const response = await fetch('/api/zmq/logs');
      const data = await response.json();
      if (data.success) {
        setLogs(data.logs);
      }
    } catch (error) {
      console.error('Failed to load initial ZMQ logs:', error);
    }
  };

  useEffect(() => {
    loadInitialLogs();
    connectToStream();
    return () => {
      disconnectFromStream();
    };
  }, []);

  const handleTypeFilter = (type) => {
    setSelectedType(type);
  };

  const handleSearch = (value) => {
    setSearchTerm(value);
  };

  const handleClear = async () => {
    try {
      const response = await fetch('/api/zmq/logs', { method: 'DELETE' });
      if (response.ok) {
        setLogs([]);
        setSearchTerm('');
        setSelectedType('all');
      }
    } catch (error) {
      console.error('Failed to clear ZMQ logs:', error);
    }
  };

  const handleTogglePause = () => {
    setIsPaused(!isPaused);
  };

  const handleReconnect = () => {
    if (isConnected) {
      disconnectFromStream();
      setTimeout(connectToStream, 1000);
    } else {
      connectToStream();
    }
  };

  const handleDownload = () => {
    const logData = logs.map(log =>
      `[${log.timestamp}] [${log.type.toUpperCase()}] ${log.message}`
    ).join('\n');

    const blob = new Blob([logData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zmq-logs-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getTypeColor = (type) => {
    const colors = {
      sent: '#7dd3fc',
      error: '#f87171',
      system: '#a78bfa'
    };
    return colors[type] || '#ffffff';
  };

  const getTypeCount = (type) => {
    return logs.filter(log => log.type === type).length;
  };

  const renderLogEntry = (log, index) => (
    <div
      key={index}
      className={`log-entry ${log.type}`}
      style={{
        padding: '6px 0',
        borderBottom: '1px solid #333',
        fontSize: '12px',
        lineHeight: '1.4',
        fontFamily: 'monospace'
      }}
    >
      <span style={{ color: '#8c8c8c', marginRight: '8px' }}>
        [{log.timestamp}]
      </span>
      <span
        style={{
          color: getTypeColor(log.type),
          marginRight: '8px',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          fontSize: '11px'
        }}
      >
        [{log.type}]
      </span>
      <span style={{ color: '#ffffff' }}>
        {log.message}
      </span>
    </div>
  );

  return (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <SendOutlined style={{ color: '#1890ff' }} />
          <Title level={4} style={{ margin: 0, color: '#ffffff' }}>
            ZeroMQ Logs
          </Title>
          <Badge count={logs.length} style={{ backgroundColor: '#1890ff' }} />
        </div>
      }
      extra={
        <Space>
          <Tooltip title="Auto-scroll to bottom">
            <Button
              size="small"
              type={autoScroll ? 'primary' : 'text'}
              onClick={() => setAutoScroll(!autoScroll)}
              style={{ color: autoScroll ? '#ffffff' : '#1890ff' }}
            >
              Auto
            </Button>
          </Tooltip>

          <Tooltip title={isConnected ? 'Disconnect' : 'Reconnect'}>
            <Button
              size="small"
              icon={isConnected ? <DisconnectOutlined /> : <LinkOutlined />}
              onClick={handleReconnect}
              type="text"
              style={{ color: isConnected ? '#faad14' : '#1890ff' }}
            />
          </Tooltip>

          <Button
            size="small"
            icon={<DownloadOutlined />}
            onClick={handleDownload}
            disabled={logs.length === 0}
            type="text"
            style={{ color: '#1890ff' }}
          >
            Export
          </Button>

          <Button
            size="small"
            icon={<ClearOutlined />}
            onClick={handleClear}
            disabled={logs.length === 0}
            type="text"
            danger
          >
            Clear
          </Button>
        </Space>
      }
    >
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Spin />
        </div>
      ) : (
        <>
          <div style={{
            marginBottom: '16px',
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FilterOutlined style={{ color: '#8c8c8c' }} />
              <Select
                size="small"
                value={selectedType}
                onChange={handleTypeFilter}
                style={{ width: '120px' }}
              >
                <Option value="all">
                  All ({logs.length})
                </Option>
                <Option value="sent">
                  Sent ({getTypeCount('sent')})
                </Option>
                <Option value="error">
                  Error ({getTypeCount('error')})
                </Option>
                <Option value="system">
                  System ({getTypeCount('system')})
                </Option>
              </Select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <SearchOutlined style={{ color: '#8c8c8c' }} />
              <Search
                size="small"
                placeholder="Search logs"
                onSearch={handleSearch}
                allowClear
                style={{ width: '200px' }}
              />
            </div>

            <Tooltip title={isPaused ? 'Resume stream' : 'Pause stream'}>
              <Button
                size="small"
                icon={isPaused ? <PlayCircleOutlined /> : <PauseOutlined />}
                onClick={handleTogglePause}
                type="text"
                style={{ color: '#1890ff' }}
              />
            </Tooltip>
          </div>

          <div
            ref={logContainerRef}
            style={{
              height: '300px',
              overflowY: 'auto',
              backgroundColor: '#1f1f1f',
              padding: '12px',
              borderRadius: '4px'
            }}
          >
            {filteredLogs.length > 0 ? (
              filteredLogs.map(renderLogEntry)
            ) : (
              <Text type="secondary">No logs available</Text>
            )}
          </div>
        </>
      )}
    </Card>
  );
};

export default ZmqLogs;
