import { memo } from "react";

interface Props {
  options: Array<{
    checked: boolean;
    label: string;
    onChange: (checked: boolean) => void;
  }>;
}

export const CheckboxGroup = memo(({ options }: Props) => {
  return (
    <div className="checkbox-group" role="group">
      {options.map((option) => (
        <label key={option.label} className="checkbox-label">
          <input
            type="checkbox"
            checked={option.checked}
            onChange={(e) => option.onChange(e.target.checked)}
          />
          <span>{option.label}</span>
        </label>
      ))}
    </div>
  );
});

CheckboxGroup.displayName = "CheckboxGroup";
