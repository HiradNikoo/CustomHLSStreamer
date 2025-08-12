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
  CodeOutlined,
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

const FFmpegLogs = () => {
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

  // Update filtered logs when logs change or filters change
  useEffect(() => {
    let filtered = logs;

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(log => log.type === selectedType);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.message.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredLogs(filtered);
  }, [logs, selectedType, searchTerm]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [filteredLogs, autoScroll]);

  // Connect to FFmpeg logs stream
  const connectToStream = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setIsLoading(true);
    const eventSource = new EventSource('/api/logs/stream');
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      setIsLoading(false);
    };

    eventSource.onmessage = (event) => {
      if (isPaused) return;
      
      try {
        const logEntry = JSON.parse(event.data);
        
        // Skip heartbeat messages
        if (logEntry.type === 'heartbeat' || logEntry.type === 'connected') {
          return;
        }
        
        setLogs(prevLogs => [...prevLogs, logEntry]);
      } catch (error) {
        console.error('Error parsing log entry:', error);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      setIsLoading(false);
    };
  };

  // Disconnect from stream
  const disconnectFromStream = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsConnected(false);
    setIsLoading(false);
  };

  // Load initial logs
  const loadInitialLogs = async () => {
    try {
      const response = await fetch('/api/logs');
      const data = await response.json();
      if (data.success) {
        setLogs(data.logs);
      }
    } catch (error) {
      console.error('Failed to load initial logs:', error);
    }
  };

  // Connect when component mounts
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
      const response = await fetch('/api/logs', { method: 'DELETE' });
      if (response.ok) {
        setLogs([]);
        setSearchTerm('');
        setSelectedType('all');
      }
    } catch (error) {
      console.error('Failed to clear logs:', error);
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
    a.download = `ffmpeg-logs-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getTypeColor = (type) => {
    const colors = {
      stdout: '#7dd3fc',
      stderr: '#fbbf24', 
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
        [{new Date(log.timestamp).toLocaleTimeString()}]
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
          <CodeOutlined style={{ color: '#1890ff' }} />
          <Title level={4} style={{ margin: 0, color: '#ffffff' }}>
            FFmpeg Logs
          </Title>
          <Badge count={logs.length} style={{ backgroundColor: '#1890ff' }} />
          {isLoading && <Spin size="small" />}
          {isConnected ? (
            <Badge status="processing" text="Live" style={{ color: '#52c41a' }} />
          ) : (
            <Badge status="error" text="Disconnected" style={{ color: '#ff4d4f' }} />
          )}
        </div>
      }
      extra={
        <Space>
          <Tooltip title={isPaused ? "Resume log updates" : "Pause log updates"}>
            <Button
              size="small"
              icon={isPaused ? <PlayCircleOutlined /> : <PauseOutlined />}
              onClick={handleTogglePause}
              type={isPaused ? 'primary' : 'text'}
              style={{ color: isPaused ? '#ffffff' : '#1890ff' }}
            />
          </Tooltip>

          <Tooltip title={isConnected ? "Reconnect" : "Connect"}>
            <Button
              size="small"
              icon={isConnected ? <DisconnectOutlined /> : <LinkOutlined />}
              onClick={handleReconnect}
              type="text"
              style={{ color: isConnected ? '#ff4d4f' : '#52c41a' }}
            />
          </Tooltip>
          
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
      {/* Filters */}
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
            style={{ width: '140px' }}
          >
            <Option value="all">
              All ({logs.length})
            </Option>
            <Option value="stdout">
              <span style={{ color: '#7dd3fc' }}>Stdout ({getTypeCount('stdout')})</span>
            </Option>
            <Option value="stderr">
              <span style={{ color: '#fbbf24' }}>Stderr ({getTypeCount('stderr')})</span>
            </Option>
            <Option value="error">
              <span style={{ color: '#f87171' }}>Error ({getTypeCount('error')})</span>
            </Option>
            <Option value="system">
              <span style={{ color: '#a78bfa' }}>System ({getTypeCount('system')})</span>
            </Option>
          </Select>
        </div>
        
        <Search
          size="small"
          placeholder="Search logs..."
          allowClear
          value={searchTerm}
          onChange={e => handleSearch(e.target.value)}
          style={{ width: '200px' }}
          prefix={<SearchOutlined style={{ color: '#8c8c8c' }} />}
        />
        
        <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
          Showing {filteredLogs.length} of {logs.length} entries
        </div>
      </div>

      {/* Log Entries */}
      <div 
        ref={logContainerRef}
        className="log-viewer"
        style={{
          height: '400px',
          overflowY: 'auto',
          background: '#0d1117',
          border: '1px solid #30363d',
          borderRadius: '6px',
          padding: '12px'
        }}
      >
        {filteredLogs.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            color: '#8c8c8c', 
            padding: '60px 20px',
            fontSize: '14px'
          }}>
            {logs.length === 0 ? (
              <div>
                <CodeOutlined style={{ fontSize: '24px', marginBottom: '8px' }} />
                <br />
                No FFmpeg logs yet
                <br />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  FFmpeg process logs will appear here in real-time
                </Text>
              </div>
            ) : (
              <div>
                <SearchOutlined style={{ fontSize: '24px', marginBottom: '8px' }} />
                <br />
                No matching log entries
                <br />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Try adjusting your filter or search criteria
                </Text>
              </div>
            )}
          </div>
        ) : (
          filteredLogs.map((log, index) => renderLogEntry(log, index))
        )}
      </div>

      {/* Log Statistics */}
      <div style={{ 
        marginTop: '12px',
        padding: '8px 12px',
        background: '#1a1a1a',
        borderRadius: '4px',
        border: '1px solid #303030',
        fontSize: '11px'
      }}>
        <Space split={<span style={{ color: '#404040' }}>|</span>}>
          <Text type="secondary">
            <span style={{ color: '#7dd3fc' }}>●</span> Stdout: {getTypeCount('stdout')}
          </Text>
          <Text type="secondary">
            <span style={{ color: '#fbbf24' }}>●</span> Stderr: {getTypeCount('stderr')}
          </Text>
          <Text type="secondary">
            <span style={{ color: '#f87171' }}>●</span> Error: {getTypeCount('error')}
          </Text>
          <Text type="secondary">
            <span style={{ color: '#a78bfa' }}>●</span> System: {getTypeCount('system')}
          </Text>
          <Text type="secondary">
            Status: {isConnected ? 'Connected' : 'Disconnected'}
          </Text>
          <Text type="secondary">
            Updates: {isPaused ? 'PAUSED' : 'LIVE'}
          </Text>
          <Text type="secondary">
            Auto-scroll: {autoScroll ? 'ON' : 'OFF'}
          </Text>
        </Space>
      </div>
    </Card>
  );
};

export default FFmpegLogs;