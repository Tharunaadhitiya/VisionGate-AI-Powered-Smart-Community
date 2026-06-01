'use client';

export default function RestrictedDatePicker({ value, onChange, className = '' }: { value: string; onChange: (val: string) => void; className?: string }) {
  const today = new Date();
  const minDate = today.toISOString().split('T')[0];
  const maxDate = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate()).toISOString().split('T')[0];
  return <input type="date" min={minDate} max={maxDate} value={value} onChange={(e) => onChange(e.target.value)} className={className || 'input-field'} />;
}
