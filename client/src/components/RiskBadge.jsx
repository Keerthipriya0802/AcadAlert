const riskClassMap = {
  Safe: "risk-pill-safe",
  "Mild Warning": "risk-pill-mild",
  "Moderate Warning": "risk-pill-moderate",
  "Severe Academic Warning": "risk-pill-severe",
};

function RiskBadge({ status }) {
  const cls = riskClassMap[status] || "risk-pill-default";
  return <span className={`risk-pill ${cls}`}>{status || "Unknown"}</span>;
}

export default RiskBadge;
