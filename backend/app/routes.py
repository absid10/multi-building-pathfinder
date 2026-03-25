from flask import Blueprint, jsonify, request
from sqlalchemy import or_

from .extensions import db
from .models import Building, Edge, Floor, Node, POI
from .services.routing import find_route


api = Blueprint("api", __name__, url_prefix="/api/v1")


@api.get("/health")
def health_check():
    return jsonify({"status": "ok"})


@api.get("/buildings")
def list_buildings():
    buildings = Building.query.order_by(Building.name.asc()).all()
    payload = [
        {
            "id": b.id,
            "code": b.code,
            "name": b.name,
            "latitude": b.latitude,
            "longitude": b.longitude,
        }
        for b in buildings
    ]
    return jsonify(payload)


@api.get("/buildings/<string:building_code>/floors")
def list_floors(building_code: str):
    building = Building.query.filter_by(code=building_code).first_or_404()
    payload = [
        {
            "id": floor.id,
            "code": floor.code,
            "name": floor.name,
            "level": floor.level,
            "width": floor.width,
            "height": floor.height,
        }
        for floor in sorted(building.floors, key=lambda floor: floor.level)
    ]
    return jsonify(payload)


@api.get("/floors/<int:floor_id>/map")
def floor_map(floor_id: int):
    floor = Floor.query.get_or_404(floor_id)
    floor_node_ids = {node.id for node in floor.nodes}
    edges = Edge.query.filter(
        or_(Edge.from_node_id.in_(floor_node_ids), Edge.to_node_id.in_(floor_node_ids))
    ).all()
    node_id_to_external_id = {
        node.id: node.external_id for node in Node.query.filter(Node.id.in_(floor_node_ids)).all()
    }

    payload = {
        "floor": {
            "id": floor.id,
            "name": floor.name,
            "code": floor.code,
            "level": floor.level,
            "width": floor.width,
            "height": floor.height,
        },
        "nodes": [
            {
                "id": node.external_id,
                "x": node.x,
                "y": node.y,
                "kind": node.kind,
            }
            for node in floor.nodes
        ],
        "edges": [
            {
                "from": node_id_to_external_id.get(edge.from_node_id),
                "to": node_id_to_external_id.get(edge.to_node_id),
                "distance_m": edge.distance_m,
                "is_accessible": edge.is_accessible,
            }
            for edge in edges
            if edge.from_node_id in node_id_to_external_id and edge.to_node_id in node_id_to_external_id
        ],
        "pois": [
            {
                "id": poi.external_id,
                "name": poi.name,
                "category": poi.category,
                "node": node_id_to_external_id.get(poi.node_id),
            }
            for poi in floor.pois
            if poi.node_id in node_id_to_external_id
        ],
    }

    return jsonify(payload)


@api.post("/routes")
def compute_route():
    data = request.get_json(silent=True) or {}
    start_external_id = data.get("startNodeId")
    end_external_id = data.get("endNodeId")

    if not start_external_id or not end_external_id:
        return jsonify({"message": "startNodeId and endNodeId are required"}), 400

    start = Node.query.filter_by(external_id=start_external_id).first()
    end = Node.query.filter_by(external_id=end_external_id).first()

    if not start or not end:
        return jsonify({"message": "start or end node was not found"}), 404

    nodes = Node.query.all()
    edges = Edge.query.all()
    route = find_route(start, end, nodes, edges)

    if not route["node_ids"]:
        return jsonify({"message": "No route available"}), 404

    return jsonify(route)
