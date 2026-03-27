import { useEffect, useMemo, useState } from "react";

function StatCard({ title, value, note, className = "", icon, variant = "primary" }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const target = Number(value) || 0;
    const duration = 850;
    const startTime = performance.now();

    function tick(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      setDisplayValue(Math.round(target * eased));
      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }, [value]);

  const cardVariantClass = useMemo(() => {
    const variantMap = {
      primary: "stat-primary",
      success: "stat-success",
      warning: "stat-warning",
      danger: "stat-danger",
    };
    return variantMap[variant] || "stat-primary";
  }, [variant]);

  const Icon = icon;

  return (
    <div className={`card stat-card h-100 ${cardVariantClass} ${className}`}>
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start mb-2">
          <h6 className="text-uppercase text-muted mb-0">{title}</h6>
          {Icon ? (
            <span className="metric-icon">
              <Icon />
            </span>
          ) : null}
        </div>
        <h3 className="fw-bold mb-1">{displayValue}</h3>
        {note ? <small className="text-muted">{note}</small> : null}
      </div>
    </div>
  );
}

export default StatCard;
