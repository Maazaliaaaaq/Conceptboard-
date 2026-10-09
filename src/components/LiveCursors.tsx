import React from 'react';
import { UserPresence } from '../types/board';

interface LiveCursorsProps {
  users: Record<string, UserPresence>;
  pan: { x: number; y: number };
  zoom: number;
}

export const LiveCursors: React.FC<LiveCursorsProps> = ({ users, pan, zoom }) => {
  const userList = Object.values(users).filter((u) => u.active !== false);

  if (userList.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
      {userList.map((user) => {
        const screenX = (user.x + pan.x) * zoom;
        const screenY = (user.y + pan.y) * zoom;

        // Skip if way out of bounds
        if (
          screenX < -200 ||
          screenX > window.innerWidth + 200 ||
          screenY < -200 ||
          screenY > window.innerHeight + 200
        ) {
          return null;
        }

        const cursorColor = user.color || '#4f46e5';

        return (
          <div
            key={user.id}
            className="absolute top-0 left-0 transition-transform duration-75 ease-out will-change-transform z-30"
            style={{
              transform: `translate3d(${screenX}px, ${screenY}px, 0)`,
            }}
          >
            {/* High-Visibility SVG Cursor Pointer */}
            <svg
              className="w-6 h-6 -rotate-45 drop-shadow-md"
              viewBox="0 0 24 24"
              fill={cursorColor}
              stroke="#ffffff"
              strokeWidth="2"
            >
              <path d="M3 3l7 18 3-7 7-3L3 3z" />
            </svg>

            {/* Name Badge with Pulse Indicator */}
            <div
              className="ml-3.5 -mt-1 px-2.5 py-1 rounded-lg text-xs font-bold text-white shadow-lg whitespace-nowrap flex items-center gap-1.5 select-none border border-white/40 backdrop-blur-xs"
              style={{ backgroundColor: cursorColor }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
              <span>{user.name || 'Student'}</span>
              {user.role === 'teacher' && (
                <span className="text-[9px] bg-black/30 px-1 py-0.2 rounded font-mono uppercase tracking-wider">
                  Teacher
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
