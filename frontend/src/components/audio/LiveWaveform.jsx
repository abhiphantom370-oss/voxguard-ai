import React, { useEffect, useRef } from 'react';

/**
 * LiveWaveform Component
 * Renders authentic real-time acoustic visualizations from Web Audio API AnalyserNode
 * including frequency domain equalizer bars and time-domain oscilloscope wave.
 * When inactive or in standby, displays a calm standby baseline grid.
 * 
 * @param {boolean} isActive
 * @param {AnalyserNode | null} analyserNode Web Audio API AnalyserNode
 * @param {boolean} isMuted
 */
export default function LiveWaveform({ isActive = false, analyserNode = null, isMuted = false }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      // Cyber background grid lines
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.06)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(width, centerY);
      ctx.stroke();

      // Standby / Muted state: render a static cyber oscillograph thread
      if (!isActive || isMuted || !analyserNode) {
        ctx.beginPath();
        ctx.strokeStyle = isMuted ? 'rgba(239, 68, 68, 0.4)' : 'rgba(100, 116, 139, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.moveTo(0, centerY);
        ctx.lineTo(width, centerY);
        ctx.stroke();

        animationFrameId = requestAnimationFrame(render);
        return;
      }

      // REAL AUDIO ANALYSIS from AnalyserNode
      const bufferLength = analyserNode.frequencyBinCount;
      const frequencyData = new Uint8Array(bufferLength);
      const timeData = new Uint8Array(bufferLength);

      analyserNode.getByteFrequencyData(frequencyData);
      analyserNode.getByteTimeDomainData(timeData);

      // 1. Draw Real Frequency Spectrum Bars
      const numBars = 48;
      const barWidth = width / numBars;
      const step = Math.max(1, Math.floor(bufferLength / numBars));

      for (let i = 0; i < numBars; i++) {
        const dataIndex = Math.min(i * step, bufferLength - 1);
        const freqValue = frequencyData[dataIndex]; // 0 to 255
        const normalized = freqValue / 255;
        const barHeight = Math.max(4, normalized * (height * 0.78));

        const x = i * barWidth + 2;
        const y = centerY - barHeight / 2;
        const w = Math.max(2, barWidth - 4);

        // Cyber gradient based on amplitude
        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
        gradient.addColorStop(0, '#00f0ff');
        gradient.addColorStop(0.5, '#3b82f6');
        gradient.addColorStop(1, '#00f0ff');

        ctx.fillStyle = gradient;
        ctx.shadowColor = 'rgba(0, 240, 255, 0.3)';
        ctx.shadowBlur = 6;
        ctx.fillRect(x, y, w, barHeight);
      }

      // 2. Draw Real Time-Domain Oscilloscope Thread
      ctx.beginPath();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 10;

      const sliceWidth = width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = timeData[i] / 128.0; // 0 to 2, 1 is center
        const y = v * centerY;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }

      ctx.lineTo(width, centerY);
      ctx.stroke();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isActive, analyserNode, isMuted]);

  return (
    <div className="waveform-canvas-container">
      <canvas
        ref={canvasRef}
        width={760}
        height={180}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
      {(!isActive || isMuted) && (
        <div style={{
          position: 'absolute',
          color: isMuted ? 'var(--threat)' : 'var(--text-muted)',
          fontSize: '0.76rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          gap: 8,
          background: 'rgba(7, 10, 18, 0.85)',
          padding: '6px 14px',
          borderRadius: '999px',
          border: `1px solid ${isMuted ? 'var(--threat-border)' : 'var(--border-subtle)'}`,
          maxWidth: '90%',
          boxSizing: 'border-box'
        }}>
          <span style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
            {isMuted
              ? 'Microphone Stream Muted — Audio Activity Paused'
              : 'Oscilloscope Standby — Start Detection to Intercept Real Audio'}
          </span>
        </div>
      )}
    </div>
  );
}
