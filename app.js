const WORLD = { width: 2400, height: 1500 };
const STORAGE_KEY = "maximum-possibility-model-v1";

const initialModel = {
  currentNodeId: "now",
  nodes: [
    { id: "birth", title: "出生", type: "birth", date: "起点", description: "所有可能性的起点。", impact: 100, probability: 100, route: "neutral", x: 230, y: 720, conditions: [], notes: "" },
    { id: "school", title: "离开家乡求学", type: "event", date: "2012", description: "第一次进入更大的世界，也第一次独立做决定。", impact: 82, probability: 100, route: "neutral", x: 490, y: 590, conditions: [], notes: "" },
    { id: "turn", title: "改变专业方向", type: "event", date: "2016", description: "放弃熟悉的路径，开始学习真正感兴趣的领域。", impact: 88, probability: 100, route: "neutral", x: 760, y: 760, conditions: [], notes: "" },
    { id: "firstjob", title: "第一份工作", type: "event", date: "2019", description: "获得现实经验，也看见能力与理想之间的距离。", impact: 74, probability: 100, route: "neutral", x: 1010, y: 590, conditions: [], notes: "" },
    { id: "now", title: "重新选择方向", type: "current", date: "现在", description: "站在经验、能力与愿望的交叉点，决定下一阶段的主线。", impact: 95, probability: 100, route: "neutral", x: 1240, y: 760, conditions: [], notes: "现在真正重要的，不只是选择什么，而是愿意为哪个选择持续投入。" },
    { id: "startup", title: "独立创业", type: "choice", date: "未来 1 年", description: "围绕熟悉的问题建立自己的产品。", impact: 94, probability: 58, route: "best", x: 1510, y: 470, conditions: [{ text: "验证 20 位真实用户", done: true }, { text: "准备 12 个月现金流", done: false }], notes: "" },
    { id: "expert", title: "成为领域专家", type: "choice", date: "未来 2 年", description: "继续积累稀缺能力，获得更大的职业选择权。", impact: 78, probability: 82, route: "neutral", x: 1540, y: 760, conditions: [{ text: "完成核心作品集", done: true }], notes: "" },
    { id: "pause", title: "维持现状", type: "choice", date: "未来 1 年", description: "暂缓主动选择，由环境决定下一步。", impact: 42, probability: 91, route: "worst", x: 1510, y: 1050, conditions: [], notes: "" },
    { id: "meaningful", title: "建立有意义的事业", type: "outcome", date: "未来 5 年", description: "拥有自主权、稳定价值创造与持续成长。", impact: 98, probability: 42, route: "best", x: 1850, y: 410, conditions: [{ text: "找到可持续商业模式", done: false }, { text: "建立互补团队", done: false }], notes: "" },
    { id: "leader", title: "带领核心团队", type: "outcome", date: "未来 5 年", description: "在组织中获得影响力，并带领团队完成重要目标。", impact: 83, probability: 67, route: "neutral", x: 1900, y: 720, conditions: [], notes: "" },
    { id: "stagnate", title: "失去主动选择权", type: "outcome", date: "未来 5 年", description: "路径依赖逐渐增强，改变的成本越来越高。", impact: 18, probability: 61, route: "worst", x: 1860, y: 1080, conditions: [], notes: "" }
  ],
  edges: [
    { id: "e1", from: "birth", to: "school", highlight: "neutral", label: "成长" },
    { id: "e2", from: "school", to: "turn", highlight: "neutral", label: "看见可能" },
    { id: "e3", from: "turn", to: "firstjob", highlight: "neutral", label: "进入现实" },
    { id: "e4", from: "firstjob", to: "now", highlight: "neutral", label: "积累与反思" },
    { id: "e5", from: "now", to: "startup", highlight: "best", label: "主动创造" },
    { id: "e6", from: "startup", to: "meaningful", highlight: "best", label: "持续验证" },
    { id: "e7", from: "now", to: "expert", highlight: "neutral", label: "稳健积累" },
    { id: "e8", from: "expert", to: "leader", highlight: "neutral", label: "扩大影响" },
    { id: "e9", from: "now", to: "pause", highlight: "worst", label: "延迟决定" },
    { id: "e10", from: "pause", to: "stagnate", highlight: "worst", label: "路径依赖" }
  ]
};

let model = loadModel();
let selectedId = null;
let routeFilter = "all";
let viewMode = "timeline";
let connecting = false;
let connectionSource = null;
let edgeHighlightMode = "neutral";
let editingEdgeText = false;
let editingEdgeId = null;
let dragState = null;
let suppressNodeClickId = null;
let view = { x: -110, y: -360, scale: 0.75 };

const $ = (selector) => document.querySelector(selector);
const nodesLayer = $("#nodesLayer");
const edgeGroup = $("#edgeGroup");
const graphWorld = $("#graphWorld");
const viewport = $("#graphViewport");
const workspace = $(".workspace");
const toast = $("#toast");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadModel() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return normalizeModel(saved ? JSON.parse(saved) : clone(initialModel));
  } catch {
    return normalizeModel(clone(initialModel));
  }
}

function normalizeModel(value) {
  value.edges.forEach((edge) => {
    edge.highlight = edge.highlight || edge.route || "neutral";
    delete edge.route;
  });
  return value;
}

function saveModel(message = "模型已同步") {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(model));
  $("#modelStatus").textContent = message;
  window.clearTimeout(saveModel.timer);
  saveModel.timer = window.setTimeout(() => $("#modelStatus").textContent = "模型已同步", 1200);
}

function getNode(id) {
  return model.nodes.find((node) => node.id === id);
}

function isLocked(node) {
  return node.conditions?.some((condition) => !condition.done);
}

function nodeTypeLabel(node) {
  return ({ birth: "人生起点", event: "过去经历", current: "当前节点", choice: "可能选择", outcome: "可能结果" })[node.type] || "人生节点";
}

function render() {
  renderNodes();
  renderEdges();
  renderSidebar();
  renderMinimap();
  renderDetails();
  applyTransform();
}

function renderNodes() {
  nodesLayer.innerHTML = "";
  model.nodes.forEach((node) => {
    const element = document.createElement("button");
    const filtered = routeFilter !== "all" && node.route !== routeFilter && node.type !== "current" && node.type !== "birth" && !isPastNode(node);
    element.className = `graph-node ${node.type} ${node.route} ${node.id === model.currentNodeId ? "current" : ""} ${node.id === selectedId ? "selected" : ""} ${node.id === connectionSource ? "connect-source" : ""} ${isLocked(node) ? "locked" : ""} ${filtered ? "filtered" : ""}`;
    element.dataset.id = node.id;
    element.style.left = `${node.x}px`;
    element.style.top = `${node.y}px`;
    element.innerHTML = `
      <span class="node-ring"></span>
      <span><span class="node-title">${escapeHtml(node.title)}</span><span class="node-meta">${escapeHtml(node.date || nodeTypeLabel(node))}</span></span>
      ${["choice", "outcome"].includes(node.type) ? `<span class="node-probability">${node.probability}%</span>` : ""}
    `;
    element.addEventListener("pointerdown", startNodeDrag);
    element.addEventListener("click", handleNodeClick);
    nodesLayer.appendChild(element);

    const addButton = document.createElement("button");
    const radius = node.id === model.currentNodeId ? 92 : node.type === "birth" ? 38 : 78;
    addButton.className = "node-add-button";
    addButton.dataset.parentId = node.id;
    addButton.style.left = `${node.x + radius}px`;
    addButton.style.top = `${node.y}px`;
    addButton.setAttribute("aria-label", `从${node.title}新增后续节点`);
    addButton.title = `从“${node.title}”新增后续节点`;
    addButton.textContent = "+";
    addButton.addEventListener("pointerdown", (event) => event.stopPropagation());
    addButton.addEventListener("click", (event) => {
      event.stopPropagation();
      openNodeDialog({ parentId: node.id });
    });
    nodesLayer.appendChild(addButton);
  });
}

function isPastNode(node) {
  return ["birth", "event"].includes(node.type);
}

function renderEdges() {
  edgeGroup.innerHTML = "";
  model.edges.forEach((edge) => {
    const from = getNode(edge.from);
    const to = getNode(edge.to);
    if (!from || !to) return;
    const dx = Math.max(90, Math.abs(to.x - from.x) * 0.45);
    const direction = to.x >= from.x ? 1 : -1;
    const path = `M ${from.x} ${from.y} C ${from.x + dx * direction} ${from.y}, ${to.x - dx * direction} ${to.y}, ${to.x} ${to.y}`;
    const filtered = routeFilter !== "all" && edge.highlight !== routeFilter;
    const hitEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
    hitEl.setAttribute("d", path);
    hitEl.setAttribute("class", "edge-hit");
    hitEl.dataset.edgeId = edge.id;
    hitEl.addEventListener("click", handleEdgeInteraction);
    edgeGroup.appendChild(hitEl);

    const visibleEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
    visibleEl.setAttribute("d", path);
    visibleEl.setAttribute("class", `edge edge-visible ${edge.highlight} ${filtered ? "filtered" : ""}`);
    visibleEl.dataset.edgeId = edge.id;
    edgeGroup.appendChild(visibleEl);

    if (edge.label) {
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", (from.x + to.x) / 2);
      text.setAttribute("y", (from.y + to.y) / 2 - 8);
      text.setAttribute("class", `edge-label ${filtered ? "filtered" : ""}`);
      text.dataset.edgeId = edge.id;
      text.textContent = edge.label;
      text.addEventListener("click", handleEdgeInteraction);
      edgeGroup.appendChild(text);
    }
  });
}

function renderSidebar() {
  const current = getNode(model.currentNodeId);
  const choices = model.nodes.filter((node) => model.edges.some((edge) => edge.from === model.currentNodeId && edge.to === node.id));
  const conditionPool = choices.flatMap((node) => node.conditions || []);
  const done = conditionPool.filter((condition) => condition.done).length;
  const readiness = conditionPool.length ? Math.round((done / conditionPool.length) * 100) : 100;

  $("#nodeCount").textContent = `${model.nodes.length} 个节点`;
  $("#pastCount").textContent = model.nodes.filter(isPastNode).length;
  $("#choiceCount").textContent = choices.length;
  $("#currentNodeTitle").textContent = current?.title || "未设置";
  $("#readinessValue").textContent = `${readiness}%`;
  $("#readinessBar").style.width = `${readiness}%`;
  $("#choiceList").innerHTML = choices.length ? choices.map((node) => `
    <button class="choice-card ${node.route}" data-choice-id="${node.id}">
      <span class="choice-route"></span>
      <span><strong>${escapeHtml(node.title)}</strong><small>${isLocked(node) ? "有未完成的前置条件" : "可以开始行动"}</small></span>
      <span>${node.probability}%</span>
    </button>
  `).join("") : `<p class="muted">还没有从当前节点出发的选择。</p>`;

  document.querySelectorAll("[data-choice-id]").forEach((button) => {
    button.addEventListener("click", () => selectNode(button.dataset.choiceId));
  });
}

function renderMinimap() {
  const svg = $("#minimapSvg");
  svg.innerHTML = "";
  model.edges.forEach((edge) => {
    const from = getNode(edge.from), to = getNode(edge.to);
    if (!from || !to) return;
    if (edge.highlight !== "neutral") {
      const highlight = document.createElementNS("http://www.w3.org/2000/svg", "line");
      highlight.setAttribute("x1", from.x); highlight.setAttribute("y1", from.y);
      highlight.setAttribute("x2", to.x); highlight.setAttribute("y2", to.y);
      highlight.setAttribute("stroke", edge.highlight === "best" ? "#d74a3a" : "#356d9e");
      highlight.setAttribute("stroke-width", "13");
      highlight.setAttribute("opacity", ".4");
      svg.appendChild(highlight);
    }
    const base = document.createElementNS("http://www.w3.org/2000/svg", "line");
    base.setAttribute("x1", from.x); base.setAttribute("y1", from.y);
    base.setAttribute("x2", to.x); base.setAttribute("y2", to.y);
    base.setAttribute("stroke", "#77736b");
    base.setAttribute("stroke-width", "5");
    base.setAttribute("opacity", ".75");
    svg.appendChild(base);
  });
  model.nodes.forEach((node) => {
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", node.x); circle.setAttribute("cy", node.y);
    circle.setAttribute("r", node.id === model.currentNodeId ? "26" : node.type === "birth" ? "10" : "18");
    circle.setAttribute("fill", node.route === "best" ? "#d74a3a" : node.route === "worst" ? "#356d9e" : "#3e3d38");
    svg.appendChild(circle);
  });
}

function renderDetails() {
  const node = getNode(selectedId);
  workspace.classList.toggle("detail-open", Boolean(node));
  $("#emptyDetail").classList.toggle("hidden", Boolean(node));
  $("#detailContent").classList.toggle("hidden", !node);
  if (!node) return;

  $("#detailType").textContent = nodeTypeLabel(node);
  $("#detailTitle").textContent = node.title;
  $("#detailDescription").textContent = node.description || "这个节点还没有描述。";
  $("#detailDate").textContent = node.date || "—";
  $("#detailImpact").textContent = `${node.impact ?? "—"}`;
  $("#detailProbability").textContent = `${node.probability ?? 100}%`;
  $("#detailNotes").value = node.notes || "";
  $("#setCurrentBtn").textContent = node.id === model.currentNodeId ? "当前节点" : "设为当前";
  $("#setCurrentBtn").disabled = node.id === model.currentNodeId;
  $("#deleteNodeBtn").style.visibility = node.type === "birth" ? "hidden" : "visible";

  const conditions = node.conditions || [];
  $("#conditionList").innerHTML = conditions.length ? conditions.map((condition, index) => `
    <label class="condition-item ${condition.done ? "done" : ""}">
      <input type="checkbox" data-condition-index="${index}" ${condition.done ? "checked" : ""}>
      <span>${escapeHtml(condition.text)}</span>
    </label>
  `).join("") : `<p class="muted">没有前置条件，此节点随时可行动。</p>`;

  document.querySelectorAll("[data-condition-index]").forEach((input) => {
    input.addEventListener("change", () => {
      node.conditions[Number(input.dataset.conditionIndex)].done = input.checked;
      saveModel("条件已更新");
      render();
    });
  });
}

function handleNodeClick(event) {
  const id = event.currentTarget.dataset.id;
  if (suppressNodeClickId === id) {
    suppressNodeClickId = null;
    return;
  }
  if (connecting) {
    if (!connectionSource) {
      connectionSource = id;
      showToast("已选择起点，请点击目标节点");
      renderNodes();
    } else if (connectionSource !== id) {
      const created = createEdge(connectionSource, id);
      connectionSource = null;
      connecting = false;
      $("#connectBtn").classList.remove("active");
      if (created) showToast("节点已连接");
      render();
    }
    return;
  }
  selectNode(id);
}

function selectNode(id) {
  selectedId = id;
  renderNodes();
  renderDetails();
  requestAnimationFrame(() => centerNode(id));
}

function createEdge(fromId, toId, highlight = edgeHighlightMode) {
  if (model.edges.some((edge) => edge.from === fromId && edge.to === toId)) {
    showToast("这两个节点已经连接");
    return false;
  }
  model.edges.push({ id: crypto.randomUUID(), from: fromId, to: toId, highlight, label: "自定义连接" });
  saveModel();
  return true;
}

function handleEdgeInteraction(event) {
  event.stopPropagation();
  const edge = model.edges.find((item) => item.id === event.currentTarget.dataset.edgeId);
  if (!edge) return;
  if (editingEdgeText) {
    editEdgeLabel(edge);
    return;
  }
  edge.highlight = edgeHighlightMode;
  saveModel("线路评价已更新");
  renderEdges();
  renderMinimap();
  showToast(highlightLabel(edgeHighlightMode));
}

function editEdgeLabel(edge) {
  editingEdgeId = edge.id;
  $("#edgeTextInput").value = edge.label || "";
  $("#edgeTextDialog").showModal();
}

function highlightLabel(highlight) {
  return ({ neutral: "已清除评价，恢复普通线", best: "已评价为最好，显示红线", worst: "已评价为最坏，显示蓝线" })[highlight] || "已清除评价，恢复普通线";
}

function startNodeDrag(event) {
  if (connecting) return;
  const node = getNode(event.currentTarget.dataset.id);
  dragState = { kind: "node", node, startX: event.clientX, startY: event.clientY, originX: node.x, originY: node.y, moved: false };
  event.currentTarget.setPointerCapture(event.pointerId);
}

viewport.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) return;
  if (event.target.closest(".graph-node, .node-add-button, .edge-hit")) return;
  dragState = { kind: "pan", startX: event.clientX, startY: event.clientY, originX: view.x, originY: view.y, moved: false };
  viewport.classList.add("panning");
});

window.addEventListener("pointermove", (event) => {
  if (!dragState) return;
  const dx = event.clientX - dragState.startX;
  const dy = event.clientY - dragState.startY;
  dragState.moved = dragState.moved || Math.abs(dx) + Math.abs(dy) > 4;
  if (dragState.kind === "node") {
    dragState.node.x = clamp(dragState.originX + dx / view.scale, 60, WORLD.width - 60);
    dragState.node.y = clamp(dragState.originY + dy / view.scale, 60, WORLD.height - 60);
    renderNodes(); renderEdges(); renderMinimap();
  } else {
    view.x = dragState.originX + dx;
    view.y = dragState.originY + dy;
    applyTransform();
  }
});

window.addEventListener("pointerup", () => {
  if (dragState?.kind === "node" && dragState.moved) {
    suppressNodeClickId = dragState.node.id;
    saveModel("节点位置已保存");
    clearTimeout(window.__clearSuppressNodeClickTimer);
    window.__clearSuppressNodeClickTimer = setTimeout(() => {
      suppressNodeClickId = null;
    }, 250);
  }
  dragState = null;
  viewport.classList.remove("panning");
});

viewport.addEventListener("wheel", (event) => {
  event.preventDefault();
  const rect = viewport.getBoundingClientRect();
  const pointerX = event.clientX - rect.left;
  const pointerY = event.clientY - rect.top;
  const worldX = (pointerX - view.x) / view.scale;
  const worldY = (pointerY - view.y) / view.scale;
  const nextScale = clamp(view.scale * (event.deltaY > 0 ? 0.9 : 1.1), 0.35, 1.7);
  view.x = pointerX - worldX * nextScale;
  view.y = pointerY - worldY * nextScale;
  view.scale = nextScale;
  applyTransform();
}, { passive: false });

function applyTransform() {
  graphWorld.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.scale})`;
  $("#zoomLabel").textContent = `${Math.round(view.scale * 100)}%`;
}

function fitView() {
  const rect = viewport.getBoundingClientRect();
  const xs = model.nodes.map((node) => node.x), ys = model.nodes.map((node) => node.y);
  const bounds = { minX: Math.min(...xs) - 160, maxX: Math.max(...xs) + 160, minY: Math.min(...ys) - 160, maxY: Math.max(...ys) + 160 };
  view.scale = clamp(Math.min(rect.width / (bounds.maxX - bounds.minX), rect.height / (bounds.maxY - bounds.minY)), .55, 1.05);
  view.x = (rect.width - (bounds.maxX - bounds.minX) * view.scale) / 2 - bounds.minX * view.scale;
  view.y = (rect.height - (bounds.maxY - bounds.minY) * view.scale) / 2 - bounds.minY * view.scale;
  applyTransform();
}

function centerNode(id) {
  const node = getNode(id);
  if (!node) return;
  view.x = viewport.clientWidth / 2 - node.x * view.scale;
  view.y = viewport.clientHeight / 2 - node.y * view.scale;
  applyTransform();
}

function setZoom(next) {
  const rect = viewport.getBoundingClientRect();
  const cx = rect.width / 2, cy = rect.height / 2;
  const worldX = (cx - view.x) / view.scale, worldY = (cy - view.y) / view.scale;
  view.scale = clamp(next, .35, 1.7);
  view.x = cx - worldX * view.scale; view.y = cy - worldY * view.scale;
  applyTransform();
}

function openNodeDialog({ parentId = null } = {}) {
  const dialog = $("#nodeDialog");
  const form = $("#nodeForm");
  const parent = getNode(parentId);
  form.reset();
  form.elements.type.value = parent ? suggestedChildType(parent) : "event";
  form.elements.impact.value = 70;
  form.elements.probability.value = 60;
  form.querySelector(".advanced-fields").open = false;
  $("#impactOutput").textContent = "70";
  $("#probabilityOutput").textContent = "60%";
  $("#dialogTitle").textContent = parent ? "添加后续节点" : "添加独立节点";
  $("#dialogEyebrow").textContent = parent ? `从「${parent.title}」向后延伸` : "扩展模型";
  $("#saveNodeBtn").textContent = parent ? "添加并连接" : "添加节点";
  dialog.dataset.parentId = parentId || "";
  dialog.showModal();
}

function suggestedChildType(parent) {
  if (["choice", "outcome"].includes(parent.type)) return "outcome";
  if (parent.type === "current") return "choice";
  return "event";
}

function getChildPosition(parent) {
  const count = model.edges.filter((edge) => edge.from === parent.id).length;
  const offsets = [0, -220, 220, -440, 440, -660, 660];
  return {
    x: clamp(parent.x + 320, 100, WORLD.width - 100),
    y: clamp(parent.y + (offsets[count] ?? count * 120), 100, WORLD.height - 100)
  };
}

$("#nodeForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const parent = getNode($("#nodeDialog").dataset.parentId);
  const center = screenToWorld(viewport.clientWidth / 2, viewport.clientHeight / 2);
  const position = parent ? getChildPosition(parent) : { x: clamp(center.x, 100, WORLD.width - 100), y: clamp(center.y, 100, WORLD.height - 100) };
  const node = {
    id: crypto.randomUUID(),
    title: data.get("title").trim(),
    description: data.get("description").trim(),
    type: data.get("type"),
    date: data.get("date").trim() || "未设时间",
    impact: Number(data.get("impact")),
    probability: Number(data.get("probability")),
    route: data.get("route"),
    x: position.x,
    y: position.y,
    conditions: [],
    notes: ""
  };
  model.nodes.push(node);
  if (parent) createEdge(parent.id, node.id, node.route);
  saveModel("新节点已添加");
  $("#nodeDialog").close();
  selectedId = node.id;
  render();
  requestAnimationFrame(() => centerNode(node.id));
  showToast(parent ? "后续节点已添加并连接" : "独立节点已添加");
});

function screenToWorld(x, y) {
  return { x: (x - view.x) / view.scale, y: (y - view.y) / view.scale };
}

$("#addNodeBtn").addEventListener("click", () => openNodeDialog());
$("#addChoiceBtn").addEventListener("click", () => openNodeDialog({ parentId: model.currentNodeId }));
$("#closeNodeDialogBtn").addEventListener("click", () => $("#nodeDialog").close());
$("#cancelNodeDialogBtn").addEventListener("click", () => $("#nodeDialog").close());
$("#closeEdgeTextDialogBtn").addEventListener("click", () => $("#edgeTextDialog").close());
$("#cancelEdgeTextDialogBtn").addEventListener("click", () => $("#edgeTextDialog").close());
$("#calculateRoutesBtn").addEventListener("click", calculateRoutes);
$("#resetModelBtn").addEventListener("click", handleResetModel);
$("#editEdgeTextBtn").addEventListener("click", () => {
  editingEdgeText = !editingEdgeText;
  $("#editEdgeTextBtn").classList.toggle("active", editingEdgeText);
  showToast(editingEdgeText ? "改字模式已开启，点击连线或线上的文字即可修改" : "已退出改字模式");
});
$("#edgeColorSelect").addEventListener("change", (event) => {
  edgeHighlightMode = event.target.value;
  $("#edgeColorDot").className = `edge-color-dot ${edgeHighlightMode}`;
  showToast(`${highlightLabel(edgeHighlightMode)}；点击普通连线应用`);
});
$("#connectBtn").addEventListener("click", () => {
  connecting = !connecting;
  connectionSource = null;
  $("#connectBtn").classList.toggle("active", connecting);
  showToast(connecting ? "请依次点击起点和目标节点" : "已退出连接模式");
  renderNodes();
});
$("#fitBtn").addEventListener("click", fitView);
$("#resetViewBtn").addEventListener("click", fitView);
$("#zoomInBtn").addEventListener("click", () => setZoom(view.scale * 1.15));
$("#zoomOutBtn").addEventListener("click", () => setZoom(view.scale * .85));
$("#dismissTip").addEventListener("click", () => $("#canvasTip").classList.add("hidden"));
$("#closeDetailBtn").addEventListener("click", () => { selectedId = null; render(); });

document.querySelectorAll(".legend-item").forEach((button) => {
  button.addEventListener("click", () => {
    routeFilter = button.dataset.filter;
    document.querySelectorAll(".legend-item").forEach((item) => item.classList.toggle("active", item === button));
    renderNodes(); renderEdges();
  });
});

document.querySelectorAll(".view-tab").forEach((button) => {
  button.addEventListener("click", () => {
    viewMode = button.dataset.mode;
    document.querySelectorAll(".view-tab").forEach((tab) => tab.classList.toggle("active", tab === button));
    if (viewMode === "decision") {
      const current = getNode(model.currentNodeId);
      view.scale = 1;
      view.x = viewport.clientWidth / 2 - current.x;
      view.y = viewport.clientHeight / 2 - current.y;
      routeFilter = "all";
      applyTransform();
    } else fitView();
  });
});

$("#detailNotes").addEventListener("input", (event) => {
  const node = getNode(selectedId);
  if (!node) return;
  node.notes = event.target.value;
  saveModel("备注已保存");
});

$("#addConditionBtn").addEventListener("click", () => {
  const node = getNode(selectedId);
  if (!node) return;
  const text = prompt("这个选择需要先完成什么？");
  if (!text?.trim()) return;
  node.conditions ||= [];
  node.conditions.push({ text: text.trim(), done: false });
  saveModel("前置条件已添加");
  render();
});

$("#setCurrentBtn").addEventListener("click", () => {
  const node = getNode(selectedId);
  if (!node) return;
  const old = getNode(model.currentNodeId);
  if (old?.type === "current") old.type = "event";
  node.type = "current";
  model.currentNodeId = node.id;
  saveModel("当前节点已更新");
  render();
  showToast(`“${node.title}”已设为当前节点`);
});

$("#deleteNodeBtn").addEventListener("click", () => {
  const node = getNode(selectedId);
  if (!node || node.type === "birth") return;
  if (!confirm(`确定删除“${node.title}”及相关连线吗？`)) return;
  model.nodes = model.nodes.filter((item) => item.id !== node.id);
  model.edges = model.edges.filter((edge) => edge.from !== node.id && edge.to !== node.id);
  if (model.currentNodeId === node.id) model.currentNodeId = "birth";
  selectedId = null;
  saveModel("节点已删除");
  render();
});

$("#exportBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(model, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `possibility-model-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  showToast("模型 JSON 已导出");
});

$("#importBtn").addEventListener("click", () => $("#importInput").click());
$("#importInput").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const imported = JSON.parse(await file.text());
    if (!Array.isArray(imported.nodes) || !Array.isArray(imported.edges)) throw new Error("invalid");
    model = normalizeModel(imported);
    selectedId = null;
    saveModel("模型已导入");
    render();
    fitView();
    showToast("模型导入成功");
  } catch {
    showToast("导入失败：文件格式不正确");
  }
  event.target.value = "";
});

$("#nodeForm").elements.impact.addEventListener("input", (event) => $("#impactOutput").textContent = event.target.value);
$("#nodeForm").elements.probability.addEventListener("input", (event) => $("#probabilityOutput").textContent = `${event.target.value}%`);
$("#edgeTextForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const edge = model.edges.find((item) => item.id === editingEdgeId);
  if (!edge) {
    $("#edgeTextDialog").close();
    return;
  }
  edge.label = $("#edgeTextInput").value.trim();
  saveModel("连线文字已更新");
  $("#edgeTextDialog").close();
  renderEdges();
  showToast(edge.label ? "连线文字已更新" : "连线文字已清除");
});
window.addEventListener("resize", () => { if (viewMode === "timeline") fitView(); });

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 1800);
}

function calculateRoutes() {
  const paths = collectPaths(model.currentNodeId);
  if (paths.length < 2) {
    showToast("至少需要两条完整路径才能推演");
    return;
  }

  const ranked = paths.map((path) => ({ path, score: scorePath(path) })).sort((a, b) => a.score - b.score);
  const worst = ranked[0];
  const best = ranked[ranked.length - 1];

  model.nodes.forEach((node) => {
    if (!isPastNode(node) && node.id !== model.currentNodeId) node.route = "neutral";
  });
  model.edges.forEach((edge) => {
    if (edge.from === model.currentNodeId || !isPastNode(getNode(edge.from))) edge.highlight = "neutral";
  });

  markPath(worst.path, "worst");
  markPath(best.path, "best");
  routeFilter = "all";
  document.querySelectorAll(".legend-item").forEach((item) => item.classList.toggle("active", item.dataset.filter === "all"));
  saveModel("路线推演完成");
  render();
  showToast(`已标注最高期望路线与最低期望路线`);
}

function handleResetModel(event) {
  const button = event.currentTarget;
  if (button.dataset.armed !== "true") {
    button.dataset.armed = "true";
    button.textContent = "确认重置";
    showToast("再次点击将恢复初始示例模型");
    clearTimeout(handleResetModel.timer);
    handleResetModel.timer = setTimeout(() => {
      button.dataset.armed = "false";
      button.textContent = "重置模型";
    }, 3000);
    return;
  }

  clearTimeout(handleResetModel.timer);
  button.dataset.armed = "false";
  button.textContent = "重置模型";
  model = normalizeModel(clone(initialModel));
  selectedId = null;
  routeFilter = "all";
  document.querySelectorAll(".legend-item").forEach((item) => item.classList.toggle("active", item.dataset.filter === "all"));
  saveModel("模型已重置");
  render();
  fitView();
  showToast("已恢复初始示例模型");
}

function collectPaths(startId) {
  const results = [];
  const walk = (nodeId, path, visited) => {
    const outgoing = model.edges.filter((edge) => edge.from === nodeId && !visited.has(edge.to));
    if (!outgoing.length) {
      if (path.length) results.push(path);
      return;
    }
    outgoing.forEach((edge) => {
      const nextVisited = new Set(visited);
      nextVisited.add(edge.to);
      walk(edge.to, [...path, edge.to], nextVisited);
    });
  };
  walk(startId, [], new Set([startId]));
  return results;
}

function scorePath(path) {
  let cumulativeProbability = 1;
  return path.reduce((score, nodeId) => {
    const node = getNode(nodeId);
    cumulativeProbability *= (node?.probability ?? 100) / 100;
    return score + ((node?.impact ?? 50) - 50) * cumulativeProbability;
  }, 0);
}

function markPath(path, route) {
  let previous = model.currentNodeId;
  path.forEach((nodeId) => {
    const node = getNode(nodeId);
    if (node) node.route = route;
    const edge = model.edges.find((item) => item.from === previous && item.to === nodeId);
    if (edge) edge.highlight = route;
    previous = nodeId;
  });
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
}

render();
requestAnimationFrame(fitView);
