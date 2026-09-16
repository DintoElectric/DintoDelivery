import { Signal, Wifi, BatteryFull } from 'lucide-react';

// The device stage + status bar. The bezel/status bar are presentation
// scaffolding per the handoff; on a narrow (real phone) viewport the frame
// drops away and the app fills the screen (see app.css media query).
export default function PhoneFrame({ children }) {
  return (
    <div className="stage">
      <div className="frame">
        <div className="statusbar">
          <span className="time">9:41</span>
          <span className="glyphs">
            <Signal size={16} strokeWidth={0} fill="#201e1d" />
            <Wifi size={16} strokeWidth={2.4} />
            <BatteryFull size={20} strokeWidth={1.8} />
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}
