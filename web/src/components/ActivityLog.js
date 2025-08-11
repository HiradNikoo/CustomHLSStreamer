import React, { useState, useRef, useEffect } from 'react';
import { 
  Card, 
  Typography, 
  Button, 
  Space, 
  Select, 
  Input,
  Badge,
  Tooltip
} from 'antd';
import {
  UnorderedListOutlined,
  ClearOutlined,
  DownloadOutlined,
  SearchOutlined,
  FilterOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;
const { Search } = Input;

const ActivityLog = ({ logs, onClear }) => {
  const [filteredLogs, setFilteredLogs] = useState(logs);
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const logContainerRef = useRef(null);

  // Update filtered logs when logs change or filters change
  useEffect(() => {
    let filtered = logs;

    // Filter by level
    if (selectedLevel !== 'all') {
      filtered = filtered.filter(log => log.level === selectedLevel);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.message.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredLogs(filtered);
  }, [logs, selectedLevel, searchTerm]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [filteredLogs, autoScroll]);

  const handleLevelFilter = (level) => {
    setSelectedLevel(level);
  };

  const handleSearch = (value) => {
    setSearchTerm(value);
  };

  const handleClear = () => {
    onClear();
    setSearchTerm('');
    setSelectedLevel('all');
  };

  const handleDownload = () => {
    const logData = logs.map(log => 
      `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}`
    ).join('\n');
    
    const blob = new Blob([logData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hls-streamer-logs-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getLevelColor = (level) => {
    const colors = {
      info: '#7dd3fc',
      warn: '#fbbf24', 
      error: '#f87171',
      debug: '#a78bfa'
    };
    return colors[level] || '#ffffff';
  };

  const getLevelCount = (level) => {
    return logs.filter(log => log.level === level).length;
  };

  const renderLogEntry = (log, index) => (
    <div 
      key={index} 
      className={`log-entry ${log.level}`}
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
          color: getLevelColor(log.level),
          marginRight: '8px',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          fontSize: '11px'
        }}
      >
        [{log.level}]
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
          <UnorderedListOutlined style={{ color: '#1890ff' }} />
          <Title level={4} style={{ margin: 0, color: '#ffffff' }}>
            Activity Log
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
            value={selectedLevel}
            onChange={handleLevelFilter}
            style={{ width: '120px' }}
          >
            <Option value="all">
              All ({logs.length})
            </Option>
            <Option value="info">
              <span style={{ color: '#7dd3fc' }}>Info ({getLevelCount('info')})</span>
            </Option>
            <Option value="warn">
              <span style={{ color: '#fbbf24' }}>Warn ({getLevelCount('warn')})</span>
            </Option>
            <Option value="error">
              <span style={{ color: '#f87171' }}>Error ({getLevelCount('error')})</span>
            </Option>
            <Option value="debug">
              <span style={{ color: '#a78bfa' }}>Debug ({getLevelCount('debug')})</span>
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
          height: '300px',
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
                <UnorderedListOutlined style={{ fontSize: '24px', marginBottom: '8px' }} />
                <br />
                No log entries yet
                <br />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Activity will appear here as you interact with the stream
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
            <span style={{ color: '#7dd3fc' }}>●</span> Info: {getLevelCount('info')}
          </Text>
          <Text type="secondary">
            <span style={{ color: '#fbbf24' }}>●</span> Warn: {getLevelCount('warn')}
          </Text>
          <Text type="secondary">
            <span style={{ color: '#f87171' }}>●</span> Error: {getLevelCount('error')}
          </Text>
          <Text type="secondary">
            <span style={{ color: '#a78bfa' }}>●</span> Debug: {getLevelCount('debug')}
          </Text>
          <Text type="secondary">
            Auto-scroll: {autoScroll ? 'ON' : 'OFF'}
          </Text>
        </Space>
      </div>
    </Card>
  );
};

export default ActivityLog;