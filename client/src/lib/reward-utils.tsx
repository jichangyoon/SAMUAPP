export const REWARD_COLORS = {
  creator: "hsl(45, 90%, 55%)",
  voter: "hsl(200, 80%, 55%)",
  platform: "hsl(280, 60%, 55%)",
};

export function MiniDonut({ size = 44, strokeWidth = 7, colors = REWARD_COLORS }: { size?: number; strokeWidth?: number; colors?: typeof REWARD_COLORS }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  const segments = [
    { percent: 45, color: colors.creator },
    { percent: 40, color: colors.voter },
    { percent: 15, color: colors.platform },
  ];
  let cumulative = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={center} cy={center} r={radius} fill="none" stroke="hsl(0,0%,20%)" strokeWidth={strokeWidth} />
      {segments.map((seg, i) => {
        const dash = (seg.percent / 100) * circumference;
        const dashArray = `${dash} ${circumference - dash}`;
        const offset = -((cumulative / 100) * circumference);
        cumulative += seg.percent;
        return (
          <circle 
            key={i} 
            cx={center} 
            cy={center} 
            r={radius} 
            fill="none" 
            stroke={seg.color}
            strokeWidth={strokeWidth} 
            strokeDasharray={dashArray} 
            strokeDashoffset={offset}
            strokeLinecap="butt" 
          />
        );
      })}
    </svg>
  );
}
