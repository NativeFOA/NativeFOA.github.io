const TASKS = {
  remove: {
    order: ["erase_stage_b_0003", "erase_stage_b_0010", "erase_stage_b_0020", "erase_stage_b_0023", "erase_stage_b_0044"],
    cases: [
      { id: "erase_stage_b_0003", prompt: "Please take out the cough to the lower right?", target: "cough", targetAzimuth: -99.37, interferer: "cough", interfererAzimuth: 16.04 },
      { id: "erase_stage_b_0010", prompt: "Can you cut the cat behind?", target: "cat", targetAzimuth: -165, interferer: "cat", interfererAzimuth: -89.76 },
      { id: "erase_stage_b_0020", prompt: "Can you strip the laughter behind on the left?", target: "laughter", targetAzimuth: 141.36, interferer: "laughter", interfererAzimuth: -135.5 },
      { id: "erase_stage_b_0023", prompt: "Erase the organ behind on the left.", target: "organ", targetAzimuth: 109.64, interferer: "organ", interfererAzimuth: 17.26 },
      { id: "erase_stage_b_0044", prompt: "Remove the female speech on the right.", target: "female speech", targetAzimuth: -95.14, interferer: "male singer", interfererAzimuth: 12.32 },
    ],
  },
  move: {
    order: ["traj_eval_0020", "traj_eval_0011", "traj_eval_0024", "traj_eval_0077", "traj_eval_0005"],
    cases: [
      { id: "traj_eval_0005", prompt: "Sweep the crow starting at the 9 o'clock position and ending at the 12 o'clock position from the 2 to 7 second mark.", target: "crow", targetAzimuth: 94.75, interferer: "piano", interfererAzimuth: -143.42, movementStart: 2.3, movementEnd: 7.1, direction: "Clockwise", waypoints: [[0,94.75],[2.3,94.75],[7.1,-2.66],[10,-2.66]] },
      { id: "traj_eval_0011", prompt: "Slide the female singer starting at the 3 o'clock position and ending at 9 o'clock starting at 4s.", target: "female singer", targetAzimuth: -90.91, interferer: "clean electric guitar", interfererAzimuth: -162.61, movementStart: 4.1, movementEnd: 10, direction: "Counterclockwise", waypoints: [[0,-90.91],[4.1,-90.91],[10,88.37]] },
      { id: "traj_eval_0020", prompt: "Drift the cricket starting at 1 o'clock and ending at the 9 o'clock position gradually.", target: "cricket", targetAzimuth: -16.36, interferer: "male singer", interfererAzimuth: -113.17, movementStart: 0, movementEnd: 10, direction: "Counterclockwise", waypoints: [[0,-16.36],[10,102.06]] },
      { id: "traj_eval_0024", prompt: "Travel the purr starting at the 9 o'clock position and ending at the 12 o'clock position.", target: "purr", targetAzimuth: 98.12, interferer: "piano", interfererAzimuth: -45.1, movementStart: 2.4, movementEnd: 6.6, direction: "Clockwise", waypoints: [[0,98.12],[2.4,98.12],[6.6,1.79],[10,1.79]] },
      { id: "traj_eval_0077", prompt: "Move the race car from 10 o'clock to 3 o'clock from 2 to 5 seconds.", target: "race car", targetAzimuth: 46.17, interferer: "crow", interfererAzimuth: 122.22, movementStart: 2, movementEnd: 5, direction: "Clockwise", waypoints: [[0,46.17],[2,46.17],[5,-90.05],[10,-90.05]] },
    ],
  },
  replace: {
    order: ["replace_eval_0074", "replace_eval_0011", "replace_eval_0042", "replace_eval_0050", "replace_eval_0070"],
    cases: [
      { id: "replace_eval_0011", prompt: "Replace the singing with female singer at back-left, nearby.", target: "singing", replacement: "female singer", replacementAzimuth: 163.121, zone: "back", distance: 0.743, interferer: "baritone saxophone", interfererAzimuth: 25.904, interfererDistance: 0.9245 },
      { id: "replace_eval_0042", prompt: "Replace the speech with saxophone at back-left, nearby.", target: "speech", replacement: "saxophone", replacementAzimuth: 161.795, zone: "back", distance: 0.7995, interferer: "electric bass", interfererAzimuth: -42.475, interfererDistance: 1.1753 },
      { id: "replace_eval_0050", prompt: "Replace the wind chime with clock.", target: "wind chime", replacement: "clock", replacementAzimuth: 143.246, zone: "back-left", distance: 1.3719, interferer: "synthesizer", interfererAzimuth: 59.355, interfererDistance: 1.9291 },
      { id: "replace_eval_0070", prompt: "Replace the crow with frog at front-right, at moderate distance.", target: "crow", replacement: "frog", replacementAzimuth: -42.037, zone: "front-right", distance: 2.8569, interferer: "wind chime", interfererAzimuth: 49.179, interfererDistance: 1.087 },
      { id: "replace_eval_0074", prompt: "Replace the female speech and woman speaking with female singer at left, at moderate distance.", target: "female speech and woman speaking", replacement: "female singer", replacementAzimuth: 97.699, zone: "left", distance: 1.5405, interferer: "harp", interfererAzimuth: 25.357, interfererDistance: 2.025 },
    ],
  },
};

const BASE_METHODS = [
  { key: "input", label: "Input" }, { key: "nativefoa", label: "NativeFOA", note: "Ours" },
  { key: "swanweave", label: "SwanWeave" }, { key: "mars-sep", label: "MARS-Sep" }, { key: "omnisep", label: "OmniSep" },
];
const outputMethodsFor = (task) => task === "remove"
  ? [{ key: "gt", label: "Reference" }, ...BASE_METHODS.slice(1)]
  : BASE_METHODS.slice(1);
const SVG_NS = "http://www.w3.org/2000/svg";
const COLORS = { grid: "#d8e1ea", path: "#2f6fec", target: "#16a085", remove: "#d9473f", retain: "#168a63", interferer: "#d9822b", listener: "#0b1828", muted: "#607084" };
let activeAudio = null;
const plotState = new Map();

function formatDegree(value) { const rounded = Math.round(value * 10) / 10; return `${rounded > 0 ? "+" : ""}${rounded}°`; }
function pointAt(azimuth, radius = 67) { const rad = azimuth * Math.PI / 180; return { x: 100 - radius * Math.sin(rad), y: 100 - radius * Math.cos(rad) }; }
function angleAt(item, time) {
  if (!item.waypoints) return item.targetAzimuth;
  const points = item.waypoints;
  if (time <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i += 1) {
    const [nextTime, nextAngle] = points[i]; const [prevTime, prevAngle] = points[i - 1];
    if (time <= nextTime) { const progress = (time - prevTime) / Math.max(nextTime - prevTime, .001); return prevAngle + (nextAngle - prevAngle) * progress; }
  }
  return points.at(-1)[1];
}
function svgEl(name, attrs = {}) { const node = document.createElementNS(SVG_NS, name); Object.entries(attrs).forEach(([key,value]) => node.setAttribute(key,value)); return node; }
function svgText(svg,text,x,y,attrs={}) { const node = svgEl("text",{x,y,...attrs}); node.textContent = text; svg.appendChild(node); }

function sourceLabel(svg,text,point,color,dy) {
  const anchor=point.x>145?"end":point.x<55?"start":"middle";
  const x=point.x+(anchor==="end"?-8:anchor==="start"?8:0);
  svgText(svg,text,x,point.y+dy,{fill:color,"font-size":10,"font-family":"Inter, sans-serif","font-weight":800,"text-anchor":anchor,stroke:"white","stroke-width":4,"paint-order":"stroke","stroke-linejoin":"round"});
}

function removalLabel(svg,name,action,point,color) {
  const anchor=point.x>145?"end":point.x<55?"start":"middle";
  const x=point.x+(anchor==="end"?-9:anchor==="start"?9:0);
  const placeBelow=point.y<70||Math.abs(point.y-100)<25;
  const y=point.y+(placeBelow?19:-17);
  const text=svgEl("text",{x,y,fill:color,"font-family":"Inter, sans-serif","font-size":12.5,"font-weight":850,"text-anchor":anchor,stroke:"white","stroke-width":4.5,"paint-order":"stroke","stroke-linejoin":"round"});
  const nameLine=svgEl("tspan",{x,dy:0}); nameLine.textContent=name;
  const actionLine=svgEl("tspan",{x,dy:13,"font-size":10.5,"font-weight":800}); actionLine.textContent=`(${action})`;
  text.append(nameLine,actionLine); svg.appendChild(text);
}

function twoLineLabel(svg,first,second,point,color,{dy=18,fontSize=10.5}={}) {
  const anchor=point.x>140?"end":point.x<60?"start":"middle";
  const x=point.x+(anchor==="end"?-9:anchor==="start"?9:0);
  const text=svgEl("text",{x,y:point.y+dy,fill:color,"font-family":"Inter, sans-serif","font-size":fontSize,"font-weight":850,"text-anchor":anchor,stroke:"white","stroke-width":4,"paint-order":"stroke","stroke-linejoin":"round"});
  const firstLine=svgEl("tspan",{x,dy:0}); firstLine.textContent=first;
  const secondLine=svgEl("tspan",{x,dy:12,"font-size":fontSize-1,"font-weight":800}); secondLine.textContent=second;
  text.append(firstLine,secondLine); svg.appendChild(text);
}

function addArrowMarker(svg,id,color) {
  const defs=svgEl("defs");
  const marker=svgEl("marker",{id,viewBox:"0 0 10 10",refX:8,refY:5,markerWidth:4.5,markerHeight:4.5,orient:"auto-start-reverse"});
  marker.appendChild(svgEl("path",{d:"M 0 0 L 10 5 L 0 10 z",fill:color}));
  defs.appendChild(marker); svg.appendChild(defs);
}

function markerLetter(svg,point,letter,color="white") {
  svgText(svg,letter,point.x,point.y+3.6,{fill:color,"font-size":10,"font-family":"Inter, sans-serif","font-weight":900,"text-anchor":"middle","pointer-events":"none"});
}

function drawScene(svg,item,task) {
  svg.setAttribute("viewBox","0 0 200 200");
  [27,47,67].forEach((r) => svg.appendChild(svgEl("circle",{cx:100,cy:100,r,fill:"none",stroke:COLORS.grid,"stroke-width":r===67?1.2:.8,"stroke-dasharray":r===67?"none":"3 4"})));
  [[100,28,100,172],[28,100,172,100]].forEach(([x1,y1,x2,y2]) => svg.appendChild(svgEl("line",{x1,y1,x2,y2,stroke:COLORS.grid,"stroke-width":.8})));
  const label={fill:COLORS.muted,"font-size":10.5,"font-family":"Inter, sans-serif","font-weight":750,"text-anchor":"middle"};
  svgText(svg,"FRONT",100,18,label); svgText(svg,"LEFT",17,103,{...label,"text-anchor":"start"}); svgText(svg,"RIGHT",183,103,{...label,"text-anchor":"end"}); svgText(svg,"BACK",100,188,label);
  svg.appendChild(svgEl("circle",{cx:100,cy:100,r:9,fill:COLORS.listener})); svg.appendChild(svgEl("path",{d:"M100 86 L95 95 L105 95 Z",fill:COLORS.listener}));
  let primaryAzimuth=item.targetAzimuth;
  if(task==="move") {
    const markerId=`move-arrow-${item.id}`; addArrowMarker(svg,markerId,COLORS.path);
    const startAngle=item.waypoints[0][1]; const endAngle=item.waypoints.at(-1)[1]; const pathPoints=[];
    for(let step=0;step<=36;step+=1){const angle=startAngle+(endAngle-startAngle)*(step/36);const p=pointAt(angle);pathPoints.push(`${p.x},${p.y}`);}
    svg.appendChild(svgEl("polyline",{points:pathPoints.join(" "),fill:"none",stroke:COLORS.path,"stroke-width":4,"stroke-linecap":"round","stroke-linejoin":"round",opacity:.82}));
    const arrowStart=pointAt(startAngle+(endAngle-startAngle)*.43); const arrowEnd=pointAt(startAngle+(endAngle-startAngle)*.55);
    svg.appendChild(svgEl("line",{x1:arrowStart.x,y1:arrowStart.y,x2:arrowEnd.x,y2:arrowEnd.y,stroke:COLORS.path,"stroke-width":3,"stroke-linecap":"round","marker-end":`url(#${markerId})`}));
    const start=pointAt(startAngle); const end=pointAt(endAngle);
    svg.appendChild(svgEl("circle",{cx:end.x,cy:end.y,r:7,fill:"white",stroke:COLORS.path,"stroke-width":3}));
    markerLetter(svg,end,"E",COLORS.path);
  }
  if(task==="replace") primaryAzimuth=item.replacementAzimuth;
  const targetPoint=pointAt(primaryAzimuth);
  const targetDot=task==="remove"
    ? svgEl("circle",{cx:targetPoint.x,cy:targetPoint.y,r:9,fill:"white",stroke:COLORS.remove,"stroke-width":3.2,"stroke-dasharray":"4 2"})
    : svgEl("circle",{cx:targetPoint.x,cy:targetPoint.y,r:7,fill:task==="move"?COLORS.path:COLORS.target,stroke:"white","stroke-width":2.5});
  svg.appendChild(targetDot);
  if(task==="remove") markerLetter(svg,targetPoint,"T",COLORS.remove);
  else if(task==="move") markerLetter(svg,targetPoint,"S");
  else if(task==="replace") markerLetter(svg,targetPoint,"T");
  if(item.interfererAzimuth!==undefined){
    const p=pointAt(item.interfererAzimuth,51);
    svg.appendChild(svgEl("circle",{cx:p.x,cy:p.y,r:task==="remove"?8:6,fill:task==="remove"?COLORS.retain:COLORS.interferer,stroke:"white","stroke-width":2.5}));
    markerLetter(svg,p,"I");
  }
  return targetDot;
}

function sceneLabels(item,task) {
  if(task==="remove") return `<div class="scene-labels"><span class="scene-label scene-label--remove"><b>T</b><span>Target: ${item.target} <em>(remove)</em></span></span><span class="scene-label scene-label--retain"><b>I</b><span>Interferer: ${item.interferer} <em>(retain)</em></span></span></div>`;
  if(task==="move") return `<div class="scene-labels"><span class="scene-label scene-label--move"><b>S→E</b><span>Target: ${item.target}</span></span><span class="scene-label scene-label--interferer"><b>I</b><span>Interferer: ${item.interferer}</span></span></div>`;
  return `<div class="scene-labels"><span class="scene-label scene-label--target"><b>T</b><span>Target: ${item.replacement}</span></span><span class="scene-label scene-label--interferer"><b>I</b><span>Interferer: ${item.interferer}</span></span></div>`;
}

function audioCell(item,task,method){return `<div class="audio-cell ${method.key==="nativefoa"?"audio-cell--ours":""}"><div class="audio-cell__label"><span>${method.label}</span>${method.note?`<em>${method.note}</em>`:""}</div><audio controls preload="metadata" data-task="${task}" data-case="${item.id}" data-method="${method.key}" src="assets/audio/${task}/${item.id}/${method.key}.mp3" aria-label="${item.id} ${method.label}"></audio></div>`;}
function caseMarkup(item,task){const methods=outputMethodsFor(task);return `<article class="case" data-case-card="${item.id}"><div class="case__left"><h3>${item.prompt}</h3>${audioCell(item,task,BASE_METHODS[0])}</div><div class="case__right"><div class="scene"><div class="plot"><svg data-plot="${item.id}" role="img" aria-label="Top-down spatial scene"></svg></div>${sceneLabels(item,task)}</div><div class="outputs" style="--method-count:${methods.length}">${methods.map((method)=>audioCell(item,task,method)).join("")}</div></div></article>`;}
function orderedCases(task){const data=TASKS[task];return data.order.map((id)=>data.cases.find((item)=>item.id===id));}
function updatePlot(audio){const state=plotState.get(audio.dataset.case);if(!state||state.task!=="move")return;const time=Number.isFinite(audio.currentTime)?audio.currentTime:0;const isInput=audio.dataset.method==="input";const angle=isInput?state.item.targetAzimuth:angleAt(state.item,time);const p=pointAt(angle);state.dot.setAttribute("cx",p.x);state.dot.setAttribute("cy",p.y);}
function bindAudio(){document.querySelectorAll("audio").forEach((audio)=>{const update=()=>updatePlot(audio);audio.addEventListener("play",()=>{if(activeAudio&&activeAudio!==audio)activeAudio.pause();activeAudio=audio;update();});audio.addEventListener("timeupdate",update);audio.addEventListener("seeked",update);audio.addEventListener("ended",update);});}
function renderTask(task){if(activeAudio){activeAudio.pause();activeAudio=null;}document.querySelectorAll("[data-task-tab]").forEach((button)=>{const selected=button.dataset.taskTab===task;button.classList.toggle("is-active",selected);button.setAttribute("aria-selected",String(selected));});const items=orderedCases(task);document.querySelector("#cases").innerHTML=items.map((item)=>caseMarkup(item,task)).join("");plotState.clear();items.forEach((item)=>{const card=document.querySelector(`[data-case-card="${item.id}"]`);const dot=drawScene(card.querySelector("svg"),item,task);plotState.set(item.id,{item,task,dot});});bindAudio();}
document.querySelectorAll("[data-task-tab]").forEach((button)=>button.addEventListener("click",()=>renderTask(button.dataset.taskTab)));
renderTask("remove");
