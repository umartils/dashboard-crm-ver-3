export function Info({
  label,
  value,
}: {
  label: string;
  value: any;
}) {
  return (
    <div className="profile-info">
      <div className="muted">{label}</div>

      <div className="profile-info-value">
        {value ?? "-"}
      </div>
    </div>
  );
}