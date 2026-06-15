function StructuredEditor({ value, onChange, parserErrors = [] }) {
  return (
    <section className="config-card">
      <div className="config-card-heading">
        <h3>结构化内容编辑</h3>
        <span>请在这里校对和调整最终内容。生成流程图时将以此处内容为准。</span>
      </div>
      <textarea
        id="structured-input"
        className="structured-editor"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={'图题：图5.6-1 项目整治技术路线图\n\n阶段一：项目整治技术路线\n\n* 消除上游污染源\n  * 洗金场堆存尾砂清挖运输'}
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
