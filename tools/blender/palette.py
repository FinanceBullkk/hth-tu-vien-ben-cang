"""Bảng màu đồng bộ với game — lấy từ client/src/scene/monastery.js, builders.js, port.js.
Giá trị lưu dạng sRGB hex; lib.py chuyển sang linear khi tô vertex colors."""

# Gỗ / đá / vôi (monastery.js:8-13)
WOOD = '#a17a51'
WOOD_DARK = '#79583d'
PILLAR = '#a47750'
PLASTER = '#eee0bf'
STONE = '#b8ac90'
STONE_LIGHT = '#d6c8aa'

# Ngói mái (builders.js:114 tileColors + addRoof)
TILE_A = '#86ad9d'
TILE_B = '#73988d'
RIDGE = '#587e70'

# Vàng đồng / lụa / đèn (avatar-attire.js:50-60, monastery.js:469)
GOLD = '#bca36b'
GOLD_BRIGHT = '#e0a458'
JADE = '#57b88a'
LANTERN_RED = '#a81f12'
GLOW_WARM = '#ffc76f'
FLAME = '#ffcf6f'

# Lá cây / nước (monastery.js:300, terrain.js:125)
PINE_DARK = '#3c5f38'
PINE_LIGHT = '#4c7040'
LEAF = '#55793a'
WATER = '#2f6f7e'
WATER_BED = '#17333b'

# Đá non bộ (monastery.js:362-366)
ROCK = '#6d6a66'
ROCK_LIGHT = '#7b7874'


def srgb_to_linear(c):
    """Decode một kênh sRGB [0..1] sang linear, khớp cách THREE.Color đọc hex."""
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def linear(hex_str):
    """'#rrggbb' -> (r, g, b) linear 0..1, để vertex colors trong GLB ra đúng màu game."""
    h = hex_str.lstrip('#')
    return tuple(srgb_to_linear(int(h[i:i + 2], 16) / 255) for i in (0, 2, 4))
