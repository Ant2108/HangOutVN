"""
HANGOUT VN — Studio 3D Vietnamese Street Food Asset Generator (Blender 5.1+)
Run:
  "D:\Blender\blender.exe" --background --python scripts/generate-food-models.py

Produces 6 optimized, Draco-compressed PBR GLB models in public/models/food/:
  1. banh-mi.glb
  2. bubble-tea.glb
  3. donut.glb
  4. burger.glb
  5. fries.glb
  6. vietnamese-snack.glb
"""

import bpy
import bmesh
import math
import os
import random
from mathutils import Euler, Matrix, Vector

OUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "public", "models", "food"))
os.makedirs(OUT_DIR, exist_ok=True)


def reset_scene():
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    for mesh in list(bpy.data.meshes):
        bpy.data.meshes.remove(mesh, do_unlink=True)
    for mat in list(bpy.data.materials):
        bpy.data.materials.remove(mat, do_unlink=True)


def srgb_to_linear(c):
    return tuple(((v / 12.92) if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4) for v in c)


def make_pbr_mat(
    name,
    srgb_color,
    roughness=0.45,
    metallic=0.0,
    coat=0.0,
    coat_roughness=0.12,
    alpha=1.0,
    subsurface=0.0,
):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    lin = srgb_to_linear(srgb_color)
    bsdf.inputs["Base Color"].default_value = (lin[0], lin[1], lin[2], 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic

    if "Coat Weight" in bsdf.inputs:
        bsdf.inputs["Coat Weight"].default_value = coat
    if "Coat Roughness" in bsdf.inputs:
        bsdf.inputs["Coat Roughness"].default_value = coat_roughness
    if "Subsurface Weight" in bsdf.inputs and subsurface > 0:
        bsdf.inputs["Subsurface Weight"].default_value = subsurface
    if alpha < 1.0 and "Alpha" in bsdf.inputs:
        bsdf.inputs["Alpha"].default_value = alpha
        if hasattr(mat, "blend_method"):
            mat.blend_method = "BLEND"
    return mat


def bake_and_link(name, bm, mat, loc=(0, 0, 0), rot=(0, 0, 0), scale=(1, 1, 1), smooth=True):
    """Bake transform directly into mesh vertices so object transform is identity (applied)."""
    mat_transform = (
        Matrix.Translation(Vector(loc))
        @ Euler(rot, "XYZ").to_matrix().to_4x4()
        @ Matrix.Diagonal((scale[0], scale[1], scale[2], 1.0))
    )
    bmesh.ops.transform(bm, matrix=mat_transform, verts=bm.verts)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)

    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()

    if smooth:
        for poly in mesh.polygons:
            poly.use_smooth = True

    obj = bpy.data.objects.new(name, mesh)
    obj.data.materials.append(mat)
    bpy.context.scene.collection.objects.link(obj)
    return obj


def add_sphere(name, radius, mat, loc=(0, 0, 0), rot=(0, 0, 0), scale=(1, 1, 1), u=24, v=14, deform_fn=None):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=u, v_segments=v, radius=radius)
    if deform_fn:
        for vert in bm.verts:
            deform_fn(vert)
    return bake_and_link(name, bm, mat, loc, rot, scale, smooth=True)


def add_cone(name, r1, r2, depth, mat, loc=(0, 0, 0), rot=(0, 0, 0), scale=(1, 1, 1), segs=28, bevel=0.0, deform_fn=None):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=segs, radius1=r1, radius2=r2, depth=depth)
    if bevel > 0:
        bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bevel, segments=2, affect="EDGES", clamp_overlap=True)
    if deform_fn:
        for vert in bm.verts:
            deform_fn(vert)
    return bake_and_link(name, bm, mat, loc, rot, scale, smooth=True)


def add_box(name, size, mat, loc=(0, 0, 0), rot=(0, 0, 0), scale=(1, 1, 1), bevel=0.08, deform_fn=None):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=size)
    if bevel > 0:
        bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bevel, segments=2, affect="EDGES", clamp_overlap=True)
    if deform_fn:
        for vert in bm.verts:
            deform_fn(vert)
    return bake_and_link(name, bm, mat, loc, rot, scale, smooth=True)


def add_torus(name, R, r, mat, loc=(0, 0, 0), rot=(0, 0, 0), scale=(1, 1, 1), major=32, minor=16, deform_fn=None):
    bm = bmesh.new()
    rings = []
    for i in range(major):
        theta = (i / major) * 2.0 * math.pi
        ct, st = math.cos(theta), math.sin(theta)
        ring = []
        for j in range(minor):
            phi = (j / minor) * 2.0 * math.pi
            cp, sp = math.cos(phi), math.sin(phi)
            x = (R + r * cp) * ct
            y = (R + r * cp) * st
            z = r * sp
            v = bm.verts.new((x, y, z))
            if deform_fn:
                deform_fn(v, theta, phi)
            ring.append(v)
        rings.append(ring)
    for i in range(major):
        ni = (i + 1) % major
        for j in range(minor):
            nj = (j + 1) % minor
            bm.faces.new((rings[i][j], rings[ni][j], rings[ni][nj], rings[i][nj]))
    return bake_and_link(name, bm, mat, loc, rot, scale, smooth=True)


def center_and_normalize(target_size=1.65):
    objs = [o for o in bpy.context.scene.collection.objects if o.type == "MESH"]
    if not objs:
        return
    min_v = Vector((1e9, 1e9, 1e9))
    max_v = Vector((-1e9, -1e9, -1e9))
    for o in objs:
        for v in o.data.vertices:
            for k in range(3):
                if v.co[k] < min_v[k]:
                    min_v[k] = v.co[k]
                if v.co[k] > max_v[k]:
                    max_v[k] = v.co[k]
    center = (min_v + max_v) * 0.5
    dims = max_v - min_v
    max_dim = max(dims.x, dims.y, dims.z)
    scale_factor = target_size / max_dim if max_dim > 1e-5 else 1.0

    for o in objs:
        for v in o.data.vertices:
            v.co = (v.co - center) * scale_factor
        o.data.update()


def export_glb(filename):
    center_and_normalize(target_size=1.65)
    objs = [o for o in bpy.context.scene.collection.objects if o.type == "MESH"]
    total_verts = sum(len(o.data.vertices) for o in objs)
    total_tris = sum(sum(max(0, len(p.vertices) - 2) for p in o.data.polygons) for o in objs)
    total_mats = len(bpy.data.materials)

    out_path = os.path.join(OUT_DIR, filename)
    bpy.ops.export_scene.gltf(
        filepath=out_path,
        export_format="GLB",
        use_selection=False,
        export_apply=True,
        export_materials="EXPORT",
        export_yup=True,
        export_draco_mesh_compression_enable=True,
        export_draco_mesh_compression_level=6,
        export_draco_position_quantization=14,
        export_draco_normal_quantization=10,
    )
    size_kb = os.path.getsize(out_path) / 1024.0
    print(f"[OK] {filename:22s} | {total_verts:5d} verts | {total_tris:5d} tris | {total_mats:2d} mats | {size_kb:6.1f} KB")


# =====================================================================
# 1. VIETNAMESE BANH MI (banh-mi.glb)
# =====================================================================
def build_banh_mi():
    reset_scene()
    mat_crust = make_pbr_mat("BanhMi_Crust", (0.86, 0.56, 0.24), roughness=0.52, subsurface=0.08)
    mat_crumb = make_pbr_mat("BanhMi_Crumb", (0.98, 0.92, 0.78), roughness=0.78)
    mat_pate = make_pbr_mat("BanhMi_Pate", (0.50, 0.30, 0.22), roughness=0.45, coat=0.25)
    mat_meat = make_pbr_mat("BanhMi_CharSiu", (0.76, 0.26, 0.16), roughness=0.36, coat=0.45)
    mat_pork = make_pbr_mat("BanhMi_ChaLua", (0.95, 0.85, 0.76), roughness=0.42)
    mat_cuc = make_pbr_mat("BanhMi_Cucumber", (0.28, 0.68, 0.28), roughness=0.32, coat=0.3)
    mat_herb = make_pbr_mat("BanhMi_Cilantro", (0.16, 0.56, 0.22), roughness=0.46)
    mat_carrot = make_pbr_mat("BanhMi_Carrot", (0.98, 0.45, 0.10), roughness=0.30, coat=0.35)
    mat_daikon = make_pbr_mat("BanhMi_Daikon", (0.97, 0.95, 0.88), roughness=0.35, coat=0.2)
    mat_chili = make_pbr_mat("BanhMi_Chili", (0.88, 0.08, 0.08), roughness=0.20, coat=0.75)

    # Tapered Vietnamese baguette with diagonal scored ridges & side-top slit
    def baguette_deform(v):
        v.co.x *= 1.42
        v.co.y *= 0.52
        v.co.z *= 0.46
        t = abs(v.co.x) / 1.42
        # Pointed Vietnamese banh mi ends
        taper = max(0.22, 1.0 - (t ** 2.1) * 0.72)
        v.co.y *= taper
        v.co.z *= taper
        # Flatten base gently
        if v.co.z < -0.22:
            v.co.z = -0.22 + (v.co.z + 0.22) * 0.25
        # Subtle golden diagonal crust score bumps on back-top
        if v.co.z > 0.12 and v.co.y < 0.08:
            score = math.sin(v.co.x * 5.2 + v.co.y * 2.5)
            v.co.z += max(0.0, score) * 0.028 * (1.0 - t)
        # Open mouth slit on front-top (+y, +z)
        if v.co.y > 0.10 and v.co.z > 0.04 and t < 0.82:
            v.co.y *= 0.82
            v.co.z *= 0.88

    add_sphere("Baguette", 1.0, mat_crust, u=32, v=18, deform_fn=baguette_deform)

    # Exposed warm crumb strip inside slit
    add_sphere("InnerCrumb", 0.82, mat_crumb, loc=(0, 0.14, 0.14), scale=(1.22, 0.24, 0.20), u=22, v=12)
    # Pate layer
    add_sphere("PateLayer", 0.70, mat_pate, loc=(0, 0.22, 0.16), scale=(1.15, 0.16, 0.14), u=20, v=10)

    # Layered Char Siu & Cha Lua slices
    for i, x in enumerate([-0.68, -0.22, 0.24, 0.68]):
        add_cone(f"CharSiu_{i}", 0.23, 0.23, 0.055, mat_meat, loc=(x, 0.24, 0.20), rot=(0.55, 0.15 * (i - 1.5), 0.18 * i), segs=18, bevel=0.012)
    for i, x in enumerate([-0.46, 0.0, 0.46]):
        add_cone(f"ChaLua_{i}", 0.21, 0.21, 0.048, mat_pork, loc=(x, 0.20, 0.24), rot=(0.45, -0.1 * (i - 1), 0.2 * i), segs=18, bevel=0.01)

    # Crisp cucumber ovals
    for i, x in enumerate([-0.60, -0.18, 0.22, 0.60]):
        add_cone(f"Cucumber_{i}", 0.16, 0.16, 0.032, mat_cuc, loc=(x, 0.30, 0.23), rot=(0.68, 0.2, 0.3 * i), scale=(1.25, 0.85, 1.0), segs=16, bevel=0.008)

    # Pickled carrot & daikon julienne ribbons
    for i in range(9):
        x = -0.74 + i * 0.185
        add_box(
            f"Pickle_{i}",
            1.0,
            mat_carrot if i % 2 == 0 else mat_daikon,
            loc=(x, 0.32 + (i % 2) * 0.03, 0.27 + (i % 3) * 0.02),
            rot=(0.35, 0.28 * ((i % 3) - 1), 0.55 * i),
            scale=(0.24, 0.038, 0.024),
            bevel=0.006,
        )

    # Fresh cilantro sprigs
    for i in range(8):
        x = -0.76 + i * 0.215
        add_sphere(
            f"Cilantro_{i}",
            0.11,
            mat_herb,
            loc=(x, 0.33, 0.31 + (i % 2) * 0.035),
            rot=(0.4, 0.3 * (i - 3.5), 0.25 * i),
            scale=(1.15, 0.72, 0.32),
            u=12,
            v=8,
        )

    # Red chili rings
    for i, x in enumerate([-0.42, 0.06, 0.50]):
        add_torus(f"Chili_{i}", 0.062, 0.022, mat_chili, loc=(x, 0.36, 0.35), rot=(0.75, 0.25 * (i - 1), 0.2 * i), major=16, minor=8)

    export_glb("banh-mi.glb")


# =====================================================================
# 2. VIETNAMESE BUBBLE TEA (bubble-tea.glb)
# =====================================================================
def build_bubble_tea():
    reset_scene()
    mat_tea = make_pbr_mat("Boba_MilkTea", (0.86, 0.67, 0.44), roughness=0.22, coat=0.45, subsurface=0.12)
    mat_caramel = make_pbr_mat("Boba_BrownSugar", (0.38, 0.19, 0.09), roughness=0.20, coat=0.65)
    mat_foam = make_pbr_mat("Boba_CheeseFoam", (0.99, 0.96, 0.89), roughness=0.38, subsurface=0.1)
    mat_boba = make_pbr_mat("Boba_Pearl", (0.07, 0.04, 0.03), roughness=0.10, coat=0.95)
    mat_lid = make_pbr_mat("Boba_LidCoral", (1.0, 0.44, 0.26), roughness=0.24, coat=0.55)
    mat_dome = make_pbr_mat("Boba_Dome", (0.98, 0.97, 0.95), roughness=0.12, coat=0.9, alpha=0.58)
    mat_straw = make_pbr_mat("Boba_StrawPink", (1.0, 0.71, 0.76), roughness=0.24, coat=0.45)
    mat_sleeve = make_pbr_mat("Boba_SleeveCream", (0.98, 0.95, 0.87), roughness=0.65)
    mat_label = make_pbr_mat("Boba_LabelYellow", (1.0, 0.82, 0.40), roughness=0.45)

    # Tapered milk tea body
    add_cone("TeaBody", 0.40, 0.56, 1.32, mat_tea, loc=(0, 0, 0), segs=32, bevel=0.025)

    # Editorial kraft/cream cup sleeve + yellow accent band
    add_cone("CupSleeve", 0.465, 0.515, 0.42, mat_sleeve, loc=(0, 0, 0.04), segs=32, bevel=0.008)
    add_cone("SleeveAccent", 0.485, 0.498, 0.11, mat_label, loc=(0, 0, 0.04), segs=32)

    # Brown sugar tiger-stripe swirl ring near lower cup
    def swirl_deform(v, theta, phi):
        v.co.z += math.sin(theta * 3.0) * 0.055

    add_torus("BrownSugarSwirl", 0.44, 0.028, mat_caramel, loc=(0, 0, -0.28), major=32, minor=10, deform_fn=swirl_deform)

    # Whipped cheese cream foam layer
    add_cone("CheeseFoam", 0.545, 0.56, 0.20, mat_foam, loc=(0, 0, 0.58), segs=32, bevel=0.02)

    # Coral-orange lid rim
    add_torus("LidRim", 0.57, 0.052, mat_lid, loc=(0, 0, 0.68), major=32, minor=14)

    # Smooth translucent dome cap (hemisphere)
    def dome_deform(v):
        if v.co.z < 0:
            v.co.z = 0
        v.co.z *= 0.55

    add_sphere("DomeCap", 0.545, mat_dome, loc=(0, 0, 0.68), u=28, v=14, deform_fn=dome_deform)

    # Angled jumbo pastel-pink boba straw
    add_cone("Straw", 0.072, 0.072, 1.56, mat_straw, loc=(0.07, 0.0, 0.80), rot=(0.0, 0.16, 0.0), segs=20, bevel=0.008)

    # Glossy tapioca boba pearls clustered at bottom
    for ring in range(2):
        count = 11 if ring == 0 else 9
        z = -0.54 + ring * 0.165
        r = 0.405 + ring * 0.028
        for i in range(count):
            ang = (i / count) * math.pi * 2.0 + ring * 0.35
            jitter_z = math.sin(i * 2.3) * 0.02
            add_sphere(
                f"Pearl_{ring}_{i}",
                0.082,
                mat_boba,
                loc=(math.cos(ang) * r, math.sin(ang) * r, z + jitter_z),
                u=12,
                v=8,
            )

    export_glb("bubble-tea.glb")


# =====================================================================
# 3. GLAZED DONUT (donut.glb)
# =====================================================================
def build_donut():
    reset_scene()
    mat_dough = make_pbr_mat("Donut_Dough", (0.86, 0.62, 0.33), roughness=0.58, subsurface=0.1)
    mat_ring_light = make_pbr_mat("Donut_FriedRing", (0.94, 0.78, 0.52), roughness=0.62)
    mat_icing = make_pbr_mat("Donut_PinkGlaze", (1.0, 0.62, 0.72), roughness=0.14, coat=0.92, coat_roughness=0.06)
    mat_drizzle = make_pbr_mat("Donut_WhiteChoc", (0.99, 0.96, 0.89), roughness=0.20, coat=0.7)
    sprinkle_mats = [
        make_pbr_mat("Sprinkle_Yellow", (1.0, 0.82, 0.34), roughness=0.26, coat=0.5),
        make_pbr_mat("Sprinkle_Mint", (0.58, 0.88, 0.70), roughness=0.26, coat=0.5),
        make_pbr_mat("Sprinkle_Orange", (1.0, 0.44, 0.26), roughness=0.26, coat=0.5),
        make_pbr_mat("Sprinkle_Cream", (0.99, 0.97, 0.91), roughness=0.26, coat=0.5),
    ]

    # Plump brioche donut body
    add_torus("DonutDough", 0.68, 0.33, mat_dough, major=36, minor=20)
    # Subtle lighter fried equator band
    add_torus("FriedBand", 0.68, 0.334, mat_ring_light, scale=(1.0, 1.0, 0.22), major=36, minor=10)

    # Organic wavy-edge glossy pink glaze on top half
    def icing_deform(v, theta, phi):
        # Only cover upper half with organic wavy drip edge
        drip = -0.05 + 0.045 * math.sin(theta * 7.0) + 0.025 * math.cos(theta * 11.0)
        if v.co.z < drip:
            v.co.z = drip
        else:
            v.co.z += 0.048

    add_torus("PinkGlaze", 0.68, 0.335, mat_icing, major=40, minor=18, deform_fn=icing_deform)

    # Decorative white-chocolate drizzle rings
    def drizzle_deform(v, theta, phi):
        v.co.x += math.cos(theta * 8.0) * 0.05
        v.co.y += math.sin(theta * 8.0) * 0.05

    add_torus("Drizzle", 0.68, 0.022, mat_drizzle, loc=(0, 0, 0.375), major=44, minor=8, deform_fn=drizzle_deform)

    # Rounded capsule sprinkles
    random.seed(42)
    for i in range(28):
        ang = (i / 28.0) * math.pi * 2.0 + random.uniform(-0.08, 0.08)
        rad = 0.50 + (i % 4) * 0.115
        x = math.cos(ang) * rad
        y = math.sin(ang) * rad
        dist_from_ridge = abs(rad - 0.68)
        z = 0.382 - (dist_from_ridge ** 1.7) * 1.15
        tilt_x = math.pi * 0.5 + random.uniform(-0.25, 0.25)
        add_cone(
            f"Sprinkle_{i}",
            0.026,
            0.026,
            0.125,
            sprinkle_mats[i % 4],
            loc=(x, y, z),
            rot=(tilt_x, random.uniform(-0.3, 0.3), ang + random.uniform(0, 1.5)),
            segs=10,
            bevel=0.012,
        )

    export_glb("donut.glb")


# =====================================================================
# 4. CHEESEBURGER (burger.glb)
# =====================================================================
def build_burger():
    reset_scene()
    mat_bun = make_pbr_mat("Burger_Bun", (0.87, 0.57, 0.24), roughness=0.46, coat=0.18, subsurface=0.08)
    mat_patty = make_pbr_mat("Burger_Patty", (0.30, 0.14, 0.08), roughness=0.68)
    mat_cheese = make_pbr_mat("Burger_Cheese", (1.0, 0.78, 0.16), roughness=0.28, coat=0.35)
    mat_tomato = make_pbr_mat("Burger_Tomato", (0.88, 0.16, 0.12), roughness=0.22, coat=0.65)
    mat_lettuce = make_pbr_mat("Burger_Lettuce", (0.28, 0.72, 0.24), roughness=0.42, subsurface=0.12)
    mat_sauce = make_pbr_mat("Burger_Sauce", (1.0, 0.48, 0.28), roughness=0.25, coat=0.55)
    mat_sesame = make_pbr_mat("Burger_Sesame", (0.99, 0.95, 0.82), roughness=0.42)

    # Bottom brioche bun
    add_cone("BottomBun", 0.72, 0.78, 0.26, mat_bun, loc=(0, 0, -0.44), segs=30, bevel=0.065)

    # Thick seared beef patty with organic surface edge
    def patty_deform(v):
        ang = math.atan2(v.co.y, v.co.x)
        r_mod = 1.0 + 0.03 * math.sin(ang * 7.0) + 0.02 * math.cos(ang * 11.0)
        v.co.x *= r_mod
        v.co.y *= r_mod

    add_cone("BeefPatty", 0.79, 0.79, 0.24, mat_patty, loc=(0, 0, -0.17), segs=30, bevel=0.045, deform_fn=patty_deform)

    # Melted cheddar slice with gently drooping corners
    def cheese_deform(v):
        dist = math.hypot(v.co.x, v.co.y)
        if dist > 0.58:
            v.co.z -= (dist - 0.58) * 0.42

    add_box("MeltedCheese", 1.24, mat_cheese, loc=(0, 0, -0.02), rot=(0, 0, 0.42), scale=(1.0, 1.0, 0.045), bevel=0.015, deform_fn=cheese_deform)

    # Juicy tomato slices
    add_cone("Tomato_1", 0.46, 0.46, 0.09, mat_tomato, loc=(-0.22, 0.14, 0.06), rot=(0.04, -0.06, 0), segs=22, bevel=0.018)
    add_cone("Tomato_2", 0.46, 0.46, 0.09, mat_tomato, loc=(0.24, -0.12, 0.07), rot=(-0.05, 0.05, 0), segs=22, bevel=0.018)

    # Ruffled crisp lettuce ring
    def lettuce_deform(v, theta, phi):
        wave = math.sin(theta * 9.0) * 0.065
        v.co.z += wave
        v.co.x *= 1.0 + 0.07 * math.cos(theta * 7.0)
        v.co.y *= 1.0 + 0.07 * math.sin(theta * 7.0)

    add_torus("Lettuce", 0.66, 0.14, mat_lettuce, loc=(0, 0, 0.16), scale=(1.0, 1.0, 0.48), major=36, minor=10, deform_fn=lettuce_deform)

    # Signature coral-orange burger sauce peek
    add_torus("SauceRing", 0.52, 0.055, mat_sauce, loc=(0, 0, 0.21), major=24, minor=8)

    # Plump toasted dome top bun
    def top_bun_deform(v):
        if v.co.z < 0:
            v.co.z *= 0.18
        else:
            v.co.z *= 0.62

    add_sphere("TopBun", 0.80, mat_bun, loc=(0, 0, 0.23), u=32, v=16, deform_fn=top_bun_deform)

    # Golden toasted sesame seeds
    for i in range(16):
        ang = (i / 16.0) * math.pi * 2.0 + (i % 2) * 0.15
        rad = 0.22 + (i % 3) * 0.18
        x = math.cos(ang) * rad
        y = math.sin(ang) * rad
        z = 0.23 + math.sqrt(max(0.01, 0.80 ** 2 - rad ** 2)) * 0.62 + 0.01
        add_sphere(
            f"Sesame_{i}",
            0.038,
            mat_sesame,
            loc=(x, y, z),
            rot=(0.25 * (rad / 0.6), 0.0, ang),
            scale=(1.45, 0.72, 0.42),
            u=10,
            v=6,
        )

    export_glb("burger.glb")


# =====================================================================
# 5. FRENCH FRIES (fries.glb)
# =====================================================================
def build_fries():
    reset_scene()
    mat_carton = make_pbr_mat("Fries_CartonCoral", (0.98, 0.36, 0.22), roughness=0.38)
    mat_stripe = make_pbr_mat("Fries_BandYellow", (1.0, 0.82, 0.34), roughness=0.36)
    mat_inner = make_pbr_mat("Fries_CartonInner", (0.98, 0.94, 0.85), roughness=0.65)
    mat_fry = make_pbr_mat("Fries_Golden", (0.98, 0.76, 0.25), roughness=0.44, subsurface=0.06)
    mat_fry_crisp = make_pbr_mat("Fries_Crispy", (0.92, 0.66, 0.18), roughness=0.48)

    # Curved scoop-top editorial fry carton
    def carton_deform(v):
        # Curved front scoop cutout
        if v.co.z > 0.15 and v.co.y > 0.0:
            scoop = (1.0 - min(1.0, abs(v.co.x) / 0.56)) * 0.24
            v.co.z -= scoop * (v.co.y / 0.38)

    add_cone("FryCarton", 0.42, 0.58, 0.98, mat_carton, loc=(0, 0, -0.22), scale=(1.12, 0.64, 1.0), segs=28, bevel=0.025, deform_fn=carton_deform)
    add_cone("CartonInner", 0.40, 0.54, 0.94, mat_inner, loc=(0, 0, -0.18), scale=(1.08, 0.60, 1.0), segs=24)
    add_cone("CartonBand", 0.485, 0.525, 0.20, mat_stripe, loc=(0, 0, -0.22), scale=(1.14, 0.66, 1.0), segs=28, bevel=0.008)

    # 18 crispy golden beveled french fries fanned naturally
    fry_specs = [
        (-0.36, 0.02, 0.36, 0.05, -0.24, 0.88),
        (-0.26, -0.05, 0.46, -0.06, -0.16, 0.96),
        (-0.16, 0.04, 0.54, 0.06, -0.10, 1.04),
        (-0.05, -0.04, 0.58, -0.04, -0.03, 1.08),
        (0.06, 0.03, 0.56, 0.04, 0.04, 1.05),
        (0.17, -0.05, 0.50, -0.05, 0.11, 0.98),
        (0.27, 0.04, 0.42, 0.06, 0.18, 0.92),
        (0.37, -0.02, 0.34, -0.04, 0.25, 0.84),
        # Back row
        (-0.30, -0.14, 0.44, -0.12, -0.18, 0.95),
        (-0.15, -0.15, 0.52, -0.10, -0.08, 1.02),
        (0.00, -0.16, 0.56, -0.11, 0.00, 1.06),
        (0.15, -0.15, 0.50, -0.10, 0.09, 1.00),
        (0.29, -0.13, 0.40, -0.12, 0.18, 0.90),
        # Front row
        (-0.24, 0.12, 0.34, 0.14, -0.14, 0.86),
        (-0.09, 0.14, 0.40, 0.15, -0.05, 0.92),
        (0.07, 0.14, 0.42, 0.14, 0.05, 0.94),
        (0.22, 0.12, 0.35, 0.15, 0.14, 0.88),
        (0.00, 0.08, 0.48, 0.09, 0.02, 0.98),
    ]

    for idx, (x, y, z, rx, ry, h) in enumerate(fry_specs):
        add_box(
            f"Fry_{idx}",
            1.0,
            mat_fry if idx % 3 != 0 else mat_fry_crisp,
            loc=(x, y, z),
            rot=(rx, ry, 0.18 * idx),
            scale=(0.095, 0.092, h),
            bevel=0.018,
        )

    export_glb("fries.glb")


# =====================================================================
# 6. VIETNAMESE SNACK FOOD — BANH TRANG TRON BOWL (vietnamese-snack.glb)
# =====================================================================
def build_vietnamese_snack():
    reset_scene()
    mat_bowl = make_pbr_mat("Snack_MintBowl", (0.72, 0.89, 0.78), roughness=0.26, coat=0.55)
    mat_bowl_rim = make_pbr_mat("Snack_BowlRim", (0.98, 0.96, 0.90), roughness=0.24, coat=0.6)
    mat_ricepaper = make_pbr_mat("Snack_RicePaper", (0.97, 0.91, 0.78), roughness=0.32, coat=0.45)
    mat_mango = make_pbr_mat("Snack_GreenMango", (0.74, 0.86, 0.34), roughness=0.35, coat=0.3)
    mat_beef = make_pbr_mat("Snack_BeefJerky", (0.68, 0.22, 0.10), roughness=0.42, coat=0.35)
    mat_egg_white = make_pbr_mat("Snack_QuailWhite", (0.99, 0.98, 0.94), roughness=0.22, coat=0.55)
    mat_egg_yolk = make_pbr_mat("Snack_QuailYolk", (1.0, 0.74, 0.14), roughness=0.38)
    mat_kumquat = make_pbr_mat("Snack_Kumquat", (0.20, 0.62, 0.22), roughness=0.28, coat=0.5)
    mat_herb = make_pbr_mat("Snack_RauRam", (0.18, 0.52, 0.22), roughness=0.46)
    mat_peanut = make_pbr_mat("Snack_Peanut", (0.80, 0.58, 0.34), roughness=0.48)
    mat_bamboo = make_pbr_mat("Snack_Chopstick", (0.86, 0.70, 0.44), roughness=0.44, coat=0.2)

    # Ceramic mint street-food bowl + cream rim + foot ring
    add_cone("BowlFoot", 0.38, 0.44, 0.09, mat_bowl_rim, loc=(0, 0, -0.46), segs=28, bevel=0.015)
    add_cone("BowlBody", 0.44, 0.80, 0.56, mat_bowl, loc=(0, 0, -0.16), segs=32, bevel=0.025)
    add_torus("BowlRim", 0.79, 0.042, mat_bowl_rim, loc=(0, 0, 0.12), major=32, minor=12)

    # Tumbled glistening rice paper mound
    add_sphere("RicePaperBase", 0.71, mat_ricepaper, loc=(0, 0, 0.08), scale=(1.0, 1.0, 0.38), u=24, v=12)

    # Halved boiled quail eggs with golden yolks arranged artistically
    for i in range(5):
        ang = (i / 5.0) * math.pi * 2.0 + 0.2
        r = 0.38
        ex, ey, ez = math.cos(ang) * r, math.sin(ang) * r, 0.27
        add_sphere(f"QuailWhite_{i}", 0.145, mat_egg_white, loc=(ex, ey, ez), rot=(0.25, 0.15, ang), scale=(1.0, 1.25, 0.72), u=14, v=10)
        add_sphere(f"QuailYolk_{i}", 0.082, mat_egg_yolk, loc=(ex, ey, ez + 0.068), rot=(0.25, 0.15, ang), scale=(1.0, 1.1, 0.55), u=12, v=8)

    # Shredded green mango & spiced beef jerky strips
    for i in range(12):
        ang = (i / 12.0) * math.pi * 2.0 + 0.15
        r = 0.18 + (i % 3) * 0.13
        add_box(
            f"Strip_{i}",
            1.0,
            mat_mango if i % 2 == 0 else mat_beef,
            loc=(math.cos(ang) * r, math.sin(ang) * r, 0.30 + (i % 3) * 0.03),
            rot=(0.35, 0.25 * ((i % 3) - 1), ang + 0.6),
            scale=(0.34, 0.048, 0.025),
            bevel=0.008,
        )

    # Fresh rau răm leaves & roasted peanuts
    for i in range(6):
        ang = (i / 6.0) * math.pi * 2.0 + 0.5
        add_sphere(f"RauRam_{i}", 0.095, mat_herb, loc=(math.cos(ang) * 0.26, math.sin(ang) * 0.26, 0.35), scale=(1.3, 0.65, 0.25), rot=(0.3, 0.2, ang), u=10, v=6)
    for i in range(7):
        ang = (i / 7.0) * math.pi * 2.0 + 0.3
        add_sphere(f"Peanut_{i}", 0.048, mat_peanut, loc=(math.cos(ang) * 0.18, math.sin(ang) * 0.18, 0.37), scale=(1.35, 0.85, 0.75), rot=(0.2, 0.3, ang), u=10, v=6)

    # Whole green kumquat crown in center
    add_sphere("Kumquat", 0.145, mat_kumquat, loc=(0.0, 0.0, 0.40), scale=(1.0, 1.0, 0.92), u=16, v=12)

    # Pair of angled bamboo chopsticks resting across the bowl
    add_cone("Chopstick_1", 0.026, 0.015, 1.55, mat_bamboo, loc=(0.30, 0.12, 0.42), rot=(0.42, -0.58, 0.18), segs=12, bevel=0.004)
    add_cone("Chopstick_2", 0.026, 0.015, 1.55, mat_bamboo, loc=(0.38, 0.03, 0.41), rot=(0.45, -0.54, 0.24), segs=12, bevel=0.004)

    export_glb("vietnamese-snack.glb")


if __name__ == "__main__":
    print(f"Exporting 6 HANGOUT VN 3D assets to: {OUT_DIR}")
    build_banh_mi()
    build_bubble_tea()
    build_donut()
    build_burger()
    build_fries()
    build_vietnamese_snack()
    print("ALL 6 DRACO-COMPRESSED GLB ASSETS GENERATED SUCCESSFULLY.")
