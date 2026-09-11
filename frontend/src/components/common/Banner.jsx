import React from 'react';
import { Info } from 'lucide-react';

export default function Banner({
  message = "Phase 1 Frontend Mode: Displaying simulated cybersecurity metrics. AI engine will be integrated in Phase 2.",
  badge = "DEMO DATA"
}) {
  return (
    <div className="demo-banner">
      <div className="demo-banner-content">
        <Info size={18} style={{ flexShrink: 0 }} />
        <span>{message}</span>
      </div>
      {badge && <span className="demo-pill">{badge}</span>}
    </div>
  );
}
