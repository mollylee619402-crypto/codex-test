function StructuredEditor({ value, onChange, parserErrors = [] }) {
  return (
    <section className="config-card">
      <div className="config-card-heading">
        <h3>结构化节点编辑</h3>
        <span>支持“阶段一：xxx”、* 节点、二级缩进子节点</span>
      </div>
      <textarea
        className="structured-editor"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={'阶段一：进场准备阶段\n* 收到中标通知书\n* 入驻现场\n  * 子节点'}
      />
      {parserErrors.length > 0 && (
        <div className="parse-warning">
          <strong>解析提示：</strong>{parserErrors.join('；')}
        </div>
      )}
    </section>
  )
}

export default StructuredEditor
