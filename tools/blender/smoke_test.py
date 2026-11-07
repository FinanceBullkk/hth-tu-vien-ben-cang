"""Smoke test: verify headless Blender can create geometry and export GLB."""
import bpy
import sys

# Clean default scene
bpy.ops.wm.read_factory_settings(use_empty=True)

# Create a simple test object: cube on a cylinder base
bpy.ops.mesh.primitive_cylinder_add(radius=0.5, depth=1.0, location=(0, 0, 0.5))
base = bpy.context.active_object
base.name = "TestBase"

bpy.ops.mesh.primitive_cube_add(size=0.8, location=(0, 0, 1.4))
cube = bpy.context.active_object
cube.name = "TestCube"

# Export GLB
out = bpy.path.abspath(sys.argv[-1])
bpy.ops.export_scene.gltf(filepath=out, use_selection=False, export_format="GLB")
print("SMOKE_TEST_OK exported to:", out)
