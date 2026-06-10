function TemplatePresetSelector({ presets, onApply }) {
  return (
    <div className="preset-list" aria-label="示例一键套用">
      {presets.map((preset) => (
        <button type="button" key={preset.id} onClick={() => onApply(preset)}>
          {preset.name}
        </button>
      ))}
    </div>
  )
}

export default TemplatePresetSelector
