interface Props {
  options: Array<{
    checked: boolean
    label: string
    onChange: (checked: boolean) => void
  }>
}

export const CheckboxGroup = ({ options }: Props) => {
  return (
    <div className="radio-group">
      {options.map((option, index) => (
        <label key={index} className="checkbox-label">
          <input
            type="checkbox"
            checked={option.checked}
            onChange={(e) => option.onChange(e.target.checked)}
          />
          <span>{option.label}</span>
        </label>
      ))}
    </div>
  )
}
