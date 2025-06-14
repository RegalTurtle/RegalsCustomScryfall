import { useEffect, useState } from "react";

function getDaysSince(startDate: string): number {
  const then = new Date(startDate);
  const now = new Date();
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((now.getTime() - then.getTime()) / msPerDay);
}

async function getApiValue(): Promise<number> {
  const res = await fetch("/api/collection/stats/total_card_count");
  const data = await res.json();
  return data.count;
}

type ProgressBarProps = {
  update: number;
};

const ProgressBar = ({ update }: ProgressBarProps) => {
  const [daysProgress, setDaysProgress] = useState(0);
  const [apiProgress, setApiProgress] = useState(0);
  const TOTAL = 30000;
  const START_DATE = "2025-05-26";

  useEffect(() => {
    const days = getDaysSince(START_DATE);
    setDaysProgress(Math.min(days * 307, TOTAL));

    getApiValue().then((val) => {
      setApiProgress(Math.min(val, TOTAL));
    });
  }, [ update ]);

  const getPercent = (val: number) => Math.min((val / TOTAL) * 100, 100);

  const daysPercent = getPercent(daysProgress);
  const apiPercent = getPercent(apiProgress);

  return (
    <div className="w-full bg-gray-300 rounded h-6 relative overflow-hidden">
      {/* Primary fill (days) */}
      <div
        className="bg-blue-600 h-full absolute left-0 top-0"
        style={{ width: `${daysPercent}%` }}
      />
      {/* Secondary fill (API) */}
      <div
        className="bg-green-400 h-full absolute left-0 top-0 opacity-60"
        style={{ width: `${apiPercent}%` }}
      />
      {/* Optional: text overlay */}
      <div className="absolute w-full text-center text-xs font-medium top-0 text-black mt-1">
        {Math.round(apiProgress)} / {TOTAL} cards | Goal: {Math.round(daysProgress)}
      </div>
    </div>
  );
};

export default ProgressBar;