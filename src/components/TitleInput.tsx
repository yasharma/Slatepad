interface TitleInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function TitleInput({ value, onChange }: TitleInputProps) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Untitled"
      className="w-full border-0 bg-transparent text-3xl font-bold text-text-primary outline-none placeholder:text-text-muted"
    />
  );
}
