interface Props<T extends string> {
  name: string
  value: T
  onChange: (value: T) => void
  options: Array<{
    value: T
    label: string
  }>
}

export const RadioGroup = <T extends string>({ name, value, onChange, options }: Props<T>) => {
  return (
    <div className="radio-group">
      {options.map((option) => (
        <label key={option.value} className="radio-label">
          <input
            type="radio"
            name={name}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
          />
          <span>{option.label}</span>
        </label>
      ))}
    </div>
  )
}
