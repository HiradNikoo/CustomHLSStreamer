import React, { useEffect, useRef, useState } from 'react';
import { Card, Alert, Button, Space, Typography, Spin } from 'antd';
import { 
  PlayCircleOutlined, 
  PauseCircleOutlined, 
  ReloadOutlined,
  FullscreenOutlined,
  SoundOutlined
} from '@ant-design/icons';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

const { Title, Text } = Typography;

const VideoPlayer = ({ streamUrl, loading, onLog }) => {
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [streamError, setStreamError] = useState(null);
  const [playerStats, setPlayerStats] = useState({
    currentTime: 0,
    duration: 0,
    buffered: 0,
    bandwidth: 0
  });

  useEffect(() => {
    // Initialize Video.js player
    if (videoRef.current && !playerRef.current) {
      const videoElement = videoRef.current;

      // Video.js options
      const options = {
        controls: true,
        responsive: true,
        fluid: true,
        playbackRates: [0.5, 1, 1.25, 1.5, 2],
        html5: {
          hls: {
            enableLowInitialPlaylist: true,
            smoothQualityChange: true,
            overrideNative: !videojs.browser.IS_SAFARI
          }
        },
        sources: [{
          src: streamUrl,
          type: 'application/x-mpegURL'
        }],
        poster: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4MCIgaGVpZ2h0PSI3MjAiIHZpZXdCb3g9IjAgMCAxMjgwIDcyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjEyODAiIGhlaWdodD0iNzIwIiBmaWxsPSIjMTQxNDE0Ii8+CjxjaXJjbGUgY3g9IjY0MCIgY3k9IjM2MCIgcj0iNDAiIGZpbGw9IiMxODkwZmYiLz4KPHRleHQgeD0iNjQwIiB5PSI0MjAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIyNCIgZmlsbD0iI2ZmZmZmZiIgdGV4dC1hbmNob3I9Im1pZGRsZSI+SExTIFN0cmVhbTwvdGV4dD4KPC9zdmc+',
        liveui: true,
        liveTracker: {
          trackingThreshold: 20,
          liveTolerance: 15
        }
      };

      // Create player
      playerRef.current = videojs(videoElement, options);
      const player = playerRef.current;

      // Player ready event
      player.ready(() => {
        setPlayerReady(true);
        onLog('info', 'Video player initialized');
        
        // Try to start playing if autoplay is desired
        setTimeout(() => {
          player.play().catch(err => {
            onLog('warn', 'Autoplay blocked by browser - click play to start');
          });
        }, 1000);
      });

      // Error handling
      player.on('error', () => {
        const error = player.error();
        const errorMessage = error ? error.message : 'Unknown player error';
        setStreamError(errorMessage);
        onLog('error', `Player error: ${errorMessage}`);
      });

      // Stream events
      player.on('loadstart', () => {
        onLog('info', 'Loading stream...');
        setStreamError(null);
      });

      player.on('loadeddata', () => {
        onLog('info', 'Stream data loaded');
      });

      player.on('canplay', () => {
        onLog('info', 'Stream ready to play');
      });

      player.on('playing', () => {
        onLog('info', 'Stream playing');
      });

      player.on('waiting', () => {
        onLog('debug', 'Stream buffering...');
      });

      player.on('stalled', () => {
        onLog('warn', 'Stream stalled');
      });

      // Update stats periodically
      const statsInterval = setInterval(() => {
        if (player && !player.isDisposed()) {
          const buffered = player.buffered();
          const bufferedEnd = buffered.length > 0 ? buffered.end(buffered.length - 1) : 0;
          
          setPlayerStats({
            currentTime: player.currentTime() || 0,
            duration: player.duration() || 0,
            buffered: bufferedEnd,
            bandwidth: player.tech()?.hls?.playlists?.media?.bandwidth || 0
          });
        }
      }, 1000);

      // Cleanup interval on unmount
      return () => clearInterval(statsInterval);
    }

    // Cleanup
    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
        setPlayerReady(false);
      }
    };
  }, []);

  // Handle stream URL changes
  useEffect(() => {
    if (playerRef.current && playerReady) {
      playerRef.current.src({
        src: streamUrl,
        type: 'application/x-mpegURL'
      });
    }
  }, [streamUrl, playerReady]);

  const handleReload = () => {
    if (playerRef.current) {
      onLog('info', 'Reloading stream...');
      playerRef.current.src({
        src: streamUrl + '?t=' + Date.now(),
        type: 'application/x-mpegURL'
      });
      playerRef.current.load();
    }
  };

  const handlePlay = () => {
    if (playerRef.current) {
      playerRef.current.play();
    }
  };

  const handlePause = () => {
    if (playerRef.current) {
      playerRef.current.pause();
    }
  };

  const handleFullscreen = () => {
    if (playerRef.current) {
      playerRef.current.requestFullscreen();
    }
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}` 
                 : `${m}:${s.toString().padStart(2, '0')}`;
  };

  const formatBandwidth = (bw) => {
    if (bw > 1000000) return `${(bw / 1000000).toFixed(1)} Mbps`;
    if (bw > 1000) return `${(bw / 1000).toFixed(1)} Kbps`;
    return `${bw} bps`;
  };

  return (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <PlayCircleOutlined style={{ color: '#1890ff' }} />
          <Title level={4} style={{ margin: 0, color: '#ffffff' }}>
            Live Stream
          </Title>
        </div>
      }
      extra={
        <Space>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={handleReload}
            size="small"
          >
            Reload
          </Button>
        </Space>
      }
    >
      {loading && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '300px',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <Spin size="large" />
          <Text type="secondary">Connecting to stream...</Text>
        </div>
      )}

      {streamError && (
        <Alert
          message="Stream Error"
          description={streamError}
          type="error"
          showIcon
          style={{ marginBottom: '16px' }}
          action={
            <Button size="small" onClick={handleReload}>
              Retry
            </Button>
          }
        />
      )}

      <div style={{ position: 'relative' }}>
        <video
          ref={videoRef}
          className="video-js vjs-default-skin"
          style={{ width: '100%', height: 'auto' }}
        />
        
        {/* Player Controls Overlay */}
        {playerReady && (
          <div style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            background: 'rgba(0, 0, 0, 0.7)',
            borderRadius: '4px',
            padding: '8px',
            display: 'flex',
            gap: '8px'
          }}>
            <Button
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={handlePlay}
              title="Play"
            />
            <Button
              size="small"
              icon={<PauseCircleOutlined />}
              onClick={handlePause}
              title="Pause"
            />
            <Button
              size="small"
              icon={<FullscreenOutlined />}
              onClick={handleFullscreen}
              title="Fullscreen"
            />
          </div>
        )}
      </div>

      {/* Stream Information */}
      <div style={{ 
        marginTop: '16px', 
        padding: '12px',
        background: '#1f1f1f',
        borderRadius: '6px',
        border: '1px solid #303030'
      }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '16px' 
        }}>
          <div>
            <Text type="secondary" style={{ fontSize: '12px' }}>STREAM URL</Text>
            <br />
            <Text code style={{ fontSize: '11px' }}>
              {window.location.origin}{streamUrl}
            </Text>
          </div>
          
          <div>
            <Text type="secondary" style={{ fontSize: '12px' }}>PLAYBACK TIME</Text>
            <br />
            <Text style={{ fontFamily: 'monospace' }}>
              {formatTime(playerStats.currentTime)}
            </Text>
          </div>
          
          <div>
            <Text type="secondary" style={{ fontSize: '12px' }}>BUFFER</Text>
            <br />
            <Text style={{ fontFamily: 'monospace' }}>
              {formatTime(playerStats.buffered)}
            </Text>
          </div>
          
          <div>
            <Text type="secondary" style={{ fontSize: '12px' }}>BANDWIDTH</Text>
            <br />
            <Text style={{ fontFamily: 'monospace' }}>
              {formatBandwidth(playerStats.bandwidth)}
            </Text>
          </div>
        </div>
      </div>

      {/* HLS.js Information */}
      <div style={{ marginTop: '8px' }}>
        <Text type="secondary" style={{ fontSize: '11px' }}>
          Using Video.js with native HLS support for optimal streaming experience
        </Text>
      </div>
    </Card>
  );
};

export default VideoPlayer;