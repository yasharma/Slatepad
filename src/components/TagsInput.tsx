interface TagsInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function TagsInput({ value, onChange }: TagsInputProps) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Tags: work, ideas, journal…"
      className="mt-2 w-full border-0 bg-transparent text-sm text-text-secondary outline-none placeholder:text-text-muted"
    />
  );
}
