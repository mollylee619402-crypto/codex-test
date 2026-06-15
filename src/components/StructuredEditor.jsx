import { useMemo, useState } from 'react'
import { parseStructuredInput, structuredInputToPlainText } from '../utils/structuredInputParser.js'

const TYPE_LABEL = { caption: '图题', stage: '阶段', node: '节点', child: '子节点' }
const TYPES = ['caption', 'stage', 'node', 'child']

function toItems(value) {
  const parsed = parseStructuredInput(value, { allowEmpty: true })
  const items = []
  if (parsed.captionText) items.push({ type: 'caption', text: parsed.captionText })
  parsed.stages.forEach((stage) => {
    items.push({ type: 'stage', text: stage.title })
    ;(stage.nodes || []).forEach((node) => {
      items.push({ type: 'node', text: node.text })
      ;(node.children || []).forEach((child) => items.push({ type: 'child', text: child }))
    })
  })
  return items.length ? items : [{ type: 'stage', text: '流程内容' }]
}

function itemsToText(items) {
  const stages = []
  let caption = ''
  let currentStage = null
  let currentNode = null
  items.forEach((item) => {
    const text = String(item.text || '').trim()
    if (!text) return
    if (item.type === 'caption') { caption = text; return }
    if (item.type === 'stage') {
      currentStage = { title: text, nodes: [] }
      stages.push(currentStage)
      currentNode = null
      return
    }
    if (!currentStage) {
      currentStage = { title: '流程内容', nodes: [] }
      stages.push(currentStage)
    }
    if (item.type === 'node') {
      currentNode = { text, children: [] }
      currentStage.nodes.push(currentNode)
      return
    }
    if (!currentNode) {
      currentNode = { text, children: [] }
      currentStage.nodes.push(currentNode)
      return
    }
    currentNode.children.push(text)
  })
  const body = structuredInputToPlainText({ stages })
  return [caption ? `图题：${caption}` : '', body].filter(Boolean).join('\n\n')
}

function level(type, delta) {
  const order = ['stage', 'node', 'child']
  const index = order.indexOf(type)
  if (index < 0) return type
  return order[Math.max(0, Math.min(order.length - 1, index + delta))]
}

function StructuredEditor({ value, onChange, parserErrors = [] }) {
  const [mode, setMode] = useState('text')
  const items = useMemo(() => toItems(value), [value])
  const updateItems = (next) => onChange(itemsToText(next))
  const patchItem = (index, patch) => updateItems(items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item))
  const move = (index, dir) => {
    const target = index + dir
    if (target < 0 || target >= items.length) return
    const next = [...items]
    ;[next[index], next[target]] = [next[target], next[index]]
    updateItems(next)
  }
  const insert = (index, item) => updateItems([...items.slice(0, index + 1), item, ...items.slice(index + 1)])
  const remove = (index) => updateItems(items.filter((_, itemIndex) => itemIndex !== index))
  const changeType = (index, type) => {
    if (type === 'caption' && items.some((item, itemIndex) => item.type === 'caption' && itemIndex !== index)) {
      updateItems(items.map((item, itemIndex) => itemIndex === index ? { ...item, type } : item.type === 'caption' ? { ...item, type: 'stage' } : item))
      return
    }
    patchItem(index, { type })
  }

  return (
    <section className="config-card structured-editor-card">
      <div className="config-card-heading">
        <h3>结构化内容编辑</h3>
        <span>支持 caption / stage / node / child 四级模型，生成流程图时将以此处内容为准。</span>
      </div>
      <div className="simple-tabs compact-tabs" role="tablist">
        <button type="button" className={mode === 'text' ? 'is-active' : ''} onClick={() => setMode('text')}>文本编辑</button>
        <button type="button" className={mode === 'structure' ? 'is-active' : ''} onClick={() => setMode('structure')}>结构编辑</button>
      </div>
      {mode === 'text' ? (
        <textarea id="structured-input" className="structured-editor" value={value} onChange={(event) => onChange(event.target.value)} placeholder={'图题：图5.6-1 项目整治技术路线图\n\n阶段一：项目整治技术路线\n\n* 消除上游污染源\n  * 洗金场堆存尾砂清挖运输'} />
      ) : (
        <div className="structure-list-editor">
          {items.map((item, index) => (
            <div className={`structure-row is-${item.type}`} key={`${index}-${item.type}`}>
              <span className="structure-type-label">{TYPE_LABEL[item.type]}</span>
              <select value={item.type} onChange={(event) => changeType(index, event.target.value)}>{TYPES.map((type) => <option key={type} value={type}>{TYPE_LABEL[type]}</option>)}</select>
              <input value={item.text} onChange={(event) => patchItem(index, { text: event.target.value })} />
              <div className="structure-actions">
                <button type="button" onClick={() => move(index, -1)}>上移</button><button type="button" onClick={() => move(index, 1)}>下移</button>
                <button type="button" onClick={() => patchItem(index, { type: level(item.type, -1) })}>升一级</button><button type="button" onClick={() => patchItem(index, { type: level(item.type, 1) })}>降一级</button>
                <button type="button" onClick={() => insert(index, { type: item.type, text: '新内容' })}>新增同级</button><button type="button" onClick={() => insert(index, { type: level(item.type, 1), text: '新子级' })}>新增子级</button>
                <button type="button" onClick={() => remove(index)}>删除</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {parserErrors.length > 0 && <div className="parse-warning"><strong>解析提示：</strong>{parserErrors.join('；')}</div>}
    </section>
  )
}

export default StructuredEditor
