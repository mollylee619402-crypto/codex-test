function TemplateManager({ templates, onLoadTemplate, onDeleteTemplate }) {
  if (!templates.length) {
    return <p className="empty-tip">暂无自定义模板，点击“保存为模板”后会显示在这里。</p>
  }

  return (
    <div className="template-list">
      {templates.map((template) => (
        <div className="template-item" key={template.id}>
          <button type="button" onClick={() => onLoadTemplate(template)} title="加载模板">
            {template.name}
          </button>
          <button type="button" className="text-danger" onClick={() => onDeleteTemplate(template.id)} title="删除模板">
            删除
          </button>
        </div>
      ))}
    </div>
  )
}

export default TemplateManager
