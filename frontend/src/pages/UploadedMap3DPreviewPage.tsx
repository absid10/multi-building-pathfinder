import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Download, Home } from "lucide-react";
import { toast } from "sonner";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { API_BASE } from "../config/api";

type GraphEdge = {
  from: string;
  to: string;
  distance_m?: number;
  weight?: number;
};

type GraphNode = {
  id: string;
  x: number;
  y: number;
  kind?: string;
};

type FloorGraph = {
  id: string;
  name: string;
  width: number;
  height: number;
  nodes: GraphNode[];
  edges: GraphEdge[];
};

type BuildingGraph = {
  name: string;
  floors: FloorGraph[];
};

type UploadedGraph = {
  buildings: BuildingGraph[];
};

const getAuthHeader = () => {
  const token = localStorage.getItem("authToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const nodeColor = (kind?: string) => {
  if (kind === "stairs") return "#f59e0b";
  if (kind === "entrance") return "#06b6d4";
  return "#10b981";
};

export default function UploadedMap3DPreviewPage() {
  const { mapId } = useParams<{ mapId: string }>();
  const navigate = useNavigate();
  const mountRef = useRef<HTMLDivElement>(null);

  const [mapName, setMapName] = useState("Uploaded Map");
  const [graph, setGraph] = useState<UploadedGraph | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sceneRef = useRef<THREE.Scene | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!mapId) return;
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE}/maps/${mapId}`, {
          headers: { ...getAuthHeader() },
        });
        if (!response.ok) throw new Error("Could not load uploaded map");
        const payload = await response.json();
        const g = payload?.analysisResult?.graph as UploadedGraph | undefined;
        if (!g?.buildings?.length) {
          throw new Error("No graph data found for 3D preview");
        }
        setMapName(payload?.name || "Uploaded Map");
        setGraph(g);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load graph");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [mapId]);

  const counts = useMemo(() => {
    if (!graph) return { buildings: 0, floors: 0, nodes: 0, edges: 0 };
    let floors = 0;
    let nodes = 0;
    let edges = 0;
    for (const b of graph.buildings) {
      floors += b.floors.length;
      for (const f of b.floors) {
        nodes += f.nodes.length;
        edges += f.edges.length;
      }
    }
    return { buildings: graph.buildings.length, floors, nodes, edges };
  }, [graph]);

  useEffect(() => {
    if (!graph || !mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#f8fafc");

    const camera = new THREE.PerspectiveCamera(60, width / height, 1, 5000);
    camera.position.set(320, 320, 320);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.innerHTML = "";
    mountRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 0, 0);

    const hemi = new THREE.HemisphereLight(0xffffff, 0x94a3b8, 1);
    scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(250, 500, 200);
    scene.add(dir);

    const axes = new THREE.AxesHelper(60);
    axes.userData.excludeFromExport = true;
    scene.add(axes);

    let buildingOffsetX = 0;
    graph.buildings.forEach((building, buildingIdx) => {
      const floors = [...building.floors];
      const maxWidth = Math.max(1, ...floors.map((f) => f.width || 1000));

      floors.forEach((floor, floorIdx) => {
        const floorY = floorIdx * 60 + buildingIdx * 220;
        const floorGroup = new THREE.Group();
        floorGroup.position.x = buildingOffsetX;

        const floorPlane = new THREE.Mesh(
          new THREE.PlaneGeometry(floor.width || 1000, floor.height || 800),
          new THREE.MeshStandardMaterial({ color: "#e2e8f0", transparent: true, opacity: 0.5, side: THREE.DoubleSide })
        );
        floorPlane.rotation.x = -Math.PI / 2;
        floorPlane.position.y = floorY;
        floorGroup.add(floorPlane);

        const nodeById = new Map<string, GraphNode>();
        floor.nodes.forEach((n) => nodeById.set(n.id, n));

        floor.edges.forEach((edge) => {
          const from = nodeById.get(edge.from);
          const to = nodeById.get(edge.to);
          if (!from || !to) return;

          const points = [
            new THREE.Vector3(from.x - floor.width / 2, floorY + 2, from.y - floor.height / 2),
            new THREE.Vector3(to.x - floor.width / 2, floorY + 2, to.y - floor.height / 2),
          ];
          const geom = new THREE.BufferGeometry().setFromPoints(points);
          const line = new THREE.Line(geom, new THREE.LineBasicMaterial({ color: "#2563eb" }));
          floorGroup.add(line);
        });

        floor.nodes.forEach((node) => {
          const mesh = new THREE.Mesh(
            new THREE.SphereGeometry(3.2, 16, 16),
            new THREE.MeshStandardMaterial({ color: nodeColor(node.kind) })
          );
          mesh.position.set(node.x - floor.width / 2, floorY + 3.5, node.y - floor.height / 2);
          floorGroup.add(mesh);
        });

        scene.add(floorGroup);
      });

      buildingOffsetX += maxWidth + 180;
    });

    const box = new THREE.Box3().setFromObject(scene);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    controls.target.copy(center);
    camera.position.set(center.x + size.x * 0.7, center.y + size.y * 1.0 + 140, center.z + size.z * 0.9);

    const onResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    let frameId = 0;
    const tick = () => {
      controls.update();
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(tick);
    };
    tick();

    sceneRef.current = scene;

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", onResize);
      controls.dispose();
      renderer.dispose();
      mountRef.current?.replaceChildren();
    };
  }, [graph]);

  const exportGlb = () => {
    if (!sceneRef.current) return;

    const exportRoot = new THREE.Group();
    sceneRef.current.traverse((child) => {
      if ((child as any).userData?.excludeFromExport) return;
      if (child === sceneRef.current) return;
      if (child.parent && child.parent.type === "Scene") {
        exportRoot.add(child.clone(true));
      }
    });

    const exporter = new GLTFExporter();
    exporter.parse(
      exportRoot,
      (result) => {
        if (!(result instanceof ArrayBuffer)) {
          toast.error("GLB export failed");
          return;
        }
        const blob = new Blob([result], { type: "model/gltf-binary" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `${mapName.replace(/\s+/g, "-").toLowerCase()}-3d.glb`;
        link.click();
        URL.revokeObjectURL(link.href);
        toast.success("GLB exported");
      },
      (err) => {
        console.error(err);
        toast.error("Could not export GLB");
      },
      { binary: true, embedImages: true }
    );
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-600">Loading 3D preview...</div>;
  }

  if (error || !graph) {
    return (
      <div className="min-h-screen p-8 bg-slate-50">
        <div className="max-w-3xl mx-auto rounded-2xl bg-white border border-red-200 p-6">
          <h1 className="text-xl font-bold text-slate-900">Could not open 3D preview</h1>
          <p className="mt-2 text-sm text-slate-600">{error || "No data"}</p>
          <button
            onClick={() => navigate(`/navigate/upload/${mapId}`)}
            className="mt-4 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm"
          >
            Back to Map
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 space-y-4">
      <div className="max-w-7xl mx-auto rounded-2xl bg-white border border-slate-200 p-4 shadow-sm flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-2 items-center">
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm"
          >
            <Home className="h-4 w-4" /> Home
          </button>
          <button
            onClick={() => navigate(`/navigate/upload/${mapId}`)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Editor
          </button>
        </div>

        <div className="text-sm text-slate-600">
          <span className="font-semibold text-slate-900">{mapName}</span>
          <span className="mx-2">•</span>
          <span>{counts.buildings} buildings</span>
          <span className="mx-2">•</span>
          <span>{counts.floors} floors</span>
          <span className="mx-2">•</span>
          <span>{counts.nodes} nodes</span>
          <span className="mx-2">•</span>
          <span>{counts.edges} edges</span>
        </div>

        <button
          onClick={exportGlb}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold"
        >
          <Download className="h-4 w-4" /> Export GLB
        </button>
      </div>

      <div className="max-w-7xl mx-auto rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm">
        <div ref={mountRef} className="w-full h-[72vh]" />
      </div>
    </div>
  );
}
