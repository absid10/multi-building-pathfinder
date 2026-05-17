/**
 * Client-side room auto-detection from floor plan images.
 *
 * Pipeline:  Image → grayscale → Otsu threshold → wall mask → dilate →
 *            flood-fill connected components → filter by area/density →
 *            generate nodes + MST edges.
 *
 * Ported from pathfinderv2/app.js (vanilla JS) into typed TypeScript.
 */

export interface DetectedNode {
  id: string;
  label: string;
  x: number;
  y: number;
  floor: string;
  kind: "room" | "corridor" | "stairs" | "entrance";
  polygon?: { x: number; y: number }[];
}

export interface DetectedEdge {
  from: string;
  to: string;
  weight?: number;
}

export interface DetectionResult {
  nodes: DetectedNode[];
  edges: DetectedEdge[];
}

// ── Grayscale conversion ───────────────────────────────────────────────
function toGrayscale(data: Uint8ClampedArray): Uint8Array {
  const gray = new Uint8Array(data.length / 4);
  for (let i = 0, t = 0; i < data.length; i += 4, t++) {
    gray[t] = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
  }
  return gray;
}

// ── Otsu adaptive threshold ───────────────────────────────────────────
function otsuThreshold(gray: Uint8Array): number {
  const histogram = new Uint32Array(256);
  for (let i = 0; i < gray.length; i++) histogram[gray[i]]++;

  const total = gray.length;
  let sum = 0;
  for (let l = 0; l < 256; l++) sum += l * histogram[l];

  let sumBg = 0, wBg = 0, maxVariance = -1, threshold = 128;
  for (let l = 0; l < 256; l++) {
    wBg += histogram[l];
    if (wBg === 0) continue;
    const wFg = total - wBg;
    if (wFg === 0) break;
    sumBg += l * histogram[l];
    const meanBg = sumBg / wBg;
    const meanFg = (sum - sumBg) / wFg;
    const variance = wBg * wFg * (meanBg - meanFg) ** 2;
    if (variance > maxVariance) { maxVariance = variance; threshold = l; }
  }
  return threshold;
}

// ── Binary morphology: dilate wall mask ──────────────────────────────
function dilateMask(mask: Uint8Array, w: number, h: number, iterations: number): Uint8Array {
  let src = mask;
  for (let iter = 0; iter < iterations; iter++) {
    const out = new Uint8Array(mask.length);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        if (src[idx] === 1) { out[idx] = 1; continue; }
        let on = 0;
        for (let dy = -1; dy <= 1 && !on; dy++) {
          const ny = y + dy;
          if (ny < 0 || ny >= h) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            if (nx < 0 || nx >= w) continue;
            if (src[ny * w + nx] === 1) { on = 1; break; }
          }
        }
        out[idx] = on;
      }
    }
    src = out;
  }
  return src;
}

// ── Flood-fill room extraction ───────────────────────────────────────
interface Component {
  area: number;
  cx: number; cy: number;
  minX: number; maxX: number;
  minY: number; maxY: number;
}

function collectComponents(
  wallMask: Uint8Array, w: number, h: number,
  minArea: number, maxArea: number
): Component[] {
  const visited = new Uint8Array(wallMask.length);
  const components: Component[] = [];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const start = y * w + x;
      if (visited[start] || wallMask[start] === 1) continue;

      const stack = [start];
      visited[start] = 1;
      let area = 0, sumX = 0, sumY = 0;
      let cMinX = x, cMaxX = x, cMinY = y, cMaxY = y;
      let touchesBorder = false;

      while (stack.length > 0) {
        const idx = stack.pop()!;
        const cx = idx % w, cy = Math.floor(idx / w);
        area++; sumX += cx; sumY += cy;
        if (cx < cMinX) cMinX = cx;
        if (cx > cMaxX) cMaxX = cx;
        if (cy < cMinY) cMinY = cy;
        if (cy > cMaxY) cMaxY = cy;
        if (cx === 0 || cy === 0 || cx === w - 1 || cy === h - 1) touchesBorder = true;

        for (const [dx, dy] of [[- 1, 0], [1, 0], [0, -1], [0, 1]]) {
          const nx = cx + dx, ny = cy + dy;
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
          const ni = ny * w + nx;
          if (!visited[ni] && wallMask[ni] === 0) { visited[ni] = 1; stack.push(ni); }
        }
      }

      if (touchesBorder || area < minArea || area > maxArea) continue;
      const boxW = cMaxX - cMinX + 1, boxH = cMaxY - cMinY + 1;
      if (boxW < 14 || boxH < 14) continue;
      if (area / (boxW * boxH) < 0.42) continue;

      components.push({
        area, cx: sumX / area, cy: sumY / area,
        minX: cMinX, maxX: cMaxX, minY: cMinY, maxY: cMaxY,
      });
    }
  }
  return components;
}

// ── Union-Find for MST edge building ─────────────────────────────────
function createUnionFind(n: number) {
  const parent = Array.from({ length: n }, (_, i) => i);
  const rank = new Array(n).fill(0);
  const find = (x: number): number => {
    while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; }
    return x;
  };
  const union = (a: number, b: number) => {
    const ra = find(a), rb = find(b);
    if (ra === rb) return;
    if (rank[ra] < rank[rb]) parent[ra] = rb;
    else if (rank[ra] > rank[rb]) parent[rb] = ra;
    else { parent[rb] = ra; rank[ra]++; }
  };
  return { find, union };
}

function buildAutoEdges(nodes: DetectedNode[], canvasW: number, canvasH: number): DetectedEdge[] {
  if (nodes.length < 2) return [];
  const diag = Math.hypot(canvasW, canvasH);
  const maxDist = diag * 0.34;

  const pairs: { i: number; j: number; dist: number }[] = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const d = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
      if (d <= maxDist) pairs.push({ i, j, dist: d });
    }
  }
  pairs.sort((a, b) => a.dist - b.dist);

  const uf = createUnionFind(nodes.length);
  const edgeMap = new Map<string, DetectedEdge>();
  const degree = new Array(nodes.length).fill(0);

  const addEdge = (i: number, j: number) => {
    const [a, b] = nodes[i].id < nodes[j].id ? [nodes[i].id, nodes[j].id] : [nodes[j].id, nodes[i].id];
    const key = `${a}::${b}`;
    if (edgeMap.has(key)) return;
    edgeMap.set(key, { from: a, to: b });
    degree[i]++; degree[j]++;
  };

  // MST pass — ensure connectivity
  for (const p of pairs) {
    if (uf.find(p.i) !== uf.find(p.j)) { uf.union(p.i, p.j); addEdge(p.i, p.j); }
  }
  // Supplemental pass — add nearby edges up to degree 3
  for (const p of pairs) {
    if (degree[p.i] >= 3 || degree[p.j] >= 3 || p.dist > diag * 0.2) continue;
    addEdge(p.i, p.j);
    if (edgeMap.size >= nodes.length * 2) break;
  }

  return Array.from(edgeMap.values());
}

// ── Slugify helper ───────────────────────────────────────────────────
function slugify(v: string): string {
  return v.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

// ── Main detection entry point ──────────────────────────────────────

export function detectRoomsFromImage(
  image: HTMLImageElement,
  targetCanvasSize: { width: number; height: number },
  floor = "1"
): DetectionResult {
  const MAX_DIM = 900;
  const srcW = image.naturalWidth, srcH = image.naturalHeight;
  const scale = Math.min(1, MAX_DIM / Math.max(srcW, srcH));
  const w = Math.max(220, Math.round(srcW * scale));
  const h = Math.max(220, Math.round(srcH * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas context unavailable");

  ctx.drawImage(image, 0, 0, w, h);
  const imgData = ctx.getImageData(0, 0, w, h);
  const gray = toGrayscale(imgData.data);
  const otsu = otsuThreshold(gray);
  const threshold = Math.max(90, Math.min(200, Math.round(otsu - 8)));

  const wallMask = new Uint8Array(w * h);
  for (let i = 0; i < gray.length; i++) wallMask[i] = gray[i] <= threshold ? 1 : 0;

  const closed = dilateMask(wallMask, w, h, 2);

  let components = collectComponents(closed, w, h,
    Math.round(w * h * 0.0012), Math.round(w * h * 0.12));

  if (components.length < 4) {
    components = collectComponents(closed, w, h,
      Math.round(w * h * 0.0007), Math.round(w * h * 0.18));
  }

  components.sort((a, b) => b.area - a.area);
  components = components.slice(0, 40);
  components.sort((a, b) => a.cy === b.cy ? a.cx - b.cx : a.cy - b.cy);

  const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
  const cW = targetCanvasSize.width, cH = targetCanvasSize.height;
  const usedIds = new Set<string>();

  const nodes: DetectedNode[] = components.map((comp, i) => {
    const cx = comp.cx / scale;
    const cy = comp.cy / scale;
    const label = `Room ${i + 1}`;
    let id = slugify(label);
    if (usedIds.has(id)) id = `${id}_${i}`;
    usedIds.add(id);

    return {
      id,
      label,
      x: clamp(Math.round(cx), 10, Math.max(10, cW - 10)),
      y: clamp(Math.round(cy), 10, Math.max(10, cH - 10)),
      floor,
      kind: "room" as const,
      polygon: [
        { x: comp.minX / scale, y: comp.minY / scale },
        { x: comp.maxX / scale, y: comp.minY / scale },
        { x: comp.maxX / scale, y: comp.maxY / scale },
        { x: comp.minX / scale, y: comp.maxY / scale },
      ],
    };
  });

  const edges = buildAutoEdges(nodes, cW, cH);

  return { nodes, edges };
}
