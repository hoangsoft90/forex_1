#!/usr/bin/env python3
"""
Generate app icons for Trading Discipline OS.
Design: Shield + Candlestick Chart + Checkmark — symbolizing trading discipline.
Brand colors: #0D2B52 (deep navy), #208AEF (bright blue), #22C55E (green), #EF4444 (red)
"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import math, os

OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'images')

# Brand colors
NAVY = (13, 43, 82)       # #0D2B52
BLUE = (32, 138, 239)     # #208AEF
GREEN = (34, 197, 94)     # #22C55E
RED = (239, 68, 68)       # #EF4444
WHITE = (255, 255, 255)
GOLD = (255, 215, 0)
LIGHT_BLUE = (100, 180, 255)
DARK_NAVY = (8, 25, 50)

def hex_color(r, g, b):
    return (r, g, b)


def draw_shield(draw, cx, cy, size, fill_color, outline_color=None, outline_width=0):
    """Draw a shield shape centered at (cx, cy) with given size."""
    w, h = size * 0.45, size * 0.52
    # Shield path: top-left, top-right, bottom-right, bottom curve, bottom-left
    points = []
    # Top flat edge
    top_y = cy - h * 0.45
    bot_y = cy + h * 0.55
    
    # Top-left corner
    tl_x = cx - w
    tr_x = cx + w
    
    # Draw shield as polygon + arc bottom
    # Upper part: trapezoid
    shield_points = [
        (cx - w * 0.95, top_y + h * 0.1),  # top-left shoulder
        (cx - w * 0.7, top_y),               # top-left
        (cx + w * 0.7, top_y),               # top-right
        (cx + w * 0.95, top_y + h * 0.1),   # top-right shoulder
        (cx + w * 0.85, cy + h * 0.15),     # right mid
        (cx + w * 0.5, cy + h * 0.45),      # right lower
        (cx, bot_y),                          # bottom point
        (cx - w * 0.5, cy + h * 0.45),      # left lower
        (cx - w * 0.85, cy + h * 0.15),     # left mid
    ]
    draw.polygon(shield_points, fill=fill_color)
    if outline_color and outline_width:
        draw.polygon(shield_points, fill=None, outline=outline_color, width=outline_width)


def draw_candlestick(draw, x, cy, body_h, wick_h, is_green=True, wick_w=2, body_w=None, color_override=None):
    """Draw a single candlestick at position x, centered vertically at cy."""
    if body_w is None:
        body_w = max(wick_w + 4, body_h // 2)
    
    color = color_override if color_override else (GREEN if is_green else RED)
    body_top = cy - body_h // 2
    body_bot = cy + body_h // 2
    wick_top = cy - wick_h // 2
    wick_bot = cy + wick_h // 2
    
    # Wick
    draw.line([(x, wick_top), (x, wick_bot)], fill=color, width=wick_w)
    # Body
    draw.rectangle([x - body_w // 2, body_top, x + body_w // 2, body_bot], fill=color)


def draw_checkmark(draw, cx, cy, size, color=WHITE, width=None):
    """Draw a checkmark centered at (cx, cy)."""
    if width is None:
        width = max(2, size // 8)
    s = size * 0.35
    points = [
        (cx - s * 0.6, cy),
        (cx - s * 0.1, cy + s * 0.5),
        (cx + s * 0.7, cy - s * 0.5),
    ]
    draw.line(points, fill=color, width=width, joint='curve')


def generate_main_icon(size=1024):
    """Generate the main 1024x1024 icon."""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    cx, cy = size // 2, size // 2
    
    # Rounded rectangle background (full icon background)
    margin = size * 0.04
    radius = size * 0.18
    # Draw rounded rect
    draw.rounded_rectangle(
        [margin, margin, size - margin, size - margin],
        radius=radius,
        fill=NAVY
    )
    
    # Subtle gradient effect via overlapping shapes
    # Draw a slightly lighter arc at top
    for i in range(20):
        alpha = int(30 - i * 1.5)
        if alpha <= 0:
            break
        y_offset = margin + radius - i * 3
        draw.rounded_rectangle(
            [margin + i * 2, y_offset, size - margin - i * 2, y_offset + size * 0.15],
            radius=radius // 2,
            fill=(BLUE[0], BLUE[1], BLUE[2], alpha)
        )
    
    # Shield (centered, slightly above middle)
    shield_cy = cy - size * 0.03
    shield_size = size * 0.72
    draw_shield(draw, cx, shield_cy, shield_size, fill_color=BLUE)
    
    # Inner shield highlight
    inner_size = shield_size * 0.88
    draw_shield(draw, cx, shield_cy, inner_size, fill_color=(25, 110, 200))
    
    # Candlestick chart inside shield
    chart_cy = shield_cy - size * 0.02
    chart_h = shield_size * 0.35
    candle_w = int(size * 0.045)
    
    # 5 candles: green, red, green, green, red (realistic pattern)
    candles = [
        (chart_cy - chart_h * 0.15, chart_h * 0.5, True),   # green, up
        (chart_cy + chart_h * 0.1, chart_h * 0.35, False),   # red, down
        (chart_cy - chart_h * 0.05, chart_h * 0.6, True),    # green, up
        (chart_cy - chart_h * 0.2, chart_h * 0.45, True),    # green, up (big)
        (chart_cy + chart_h * 0.15, chart_h * 0.3, False),   # red, down (small)
    ]
    
    total_w = candle_w * 5 + (size * 0.03) * 4
    start_x = cx - total_w // 2
    
    for i, (cy_i, h_i, is_green) in enumerate(candles):
        x = start_x + i * (candle_w + size * 0.03) + candle_w // 2
        wick_h = int(h_i * 1.5)
        draw_candlestick(draw, x, cy_i, int(h_i), wick_h, is_green, 
                        wick_w=max(2, size // 200), body_w=candle_w)
    
    # Uptrend line (subtle)
    line_y_start = chart_cy + chart_h * 0.15
    line_y_end = chart_cy - chart_h * 0.25
    line_x_start = start_x
    line_x_end = start_x + total_w
    draw.line([(line_x_start, line_y_start), (line_x_end, line_y_end)], 
              fill=(255, 255, 255, 80), width=max(2, size // 250))
    
    # Checkmark below chart (discipline = success)
    check_cy = shield_cy + shield_size * 0.22
    check_size = shield_size * 0.3
    draw_checkmark(draw, cx, check_cy, check_size, color=GOLD, width=max(3, size // 130))
    
    # Text "TDO" at bottom (subtle branding)
    try:
        font_size = int(size * 0.075)
        font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', font_size)
        text = "TDO"
        bbox = draw.textbbox((0, 0), text, font=font)
        tw = bbox[2] - bbox[0]
        tx = cx - tw // 2
        ty = shield_cy + shield_size * 0.38
        # Text shadow
        draw.text((tx + 1, ty + 1), text, fill=(0, 0, 0, 100), font=font)
        draw.text((tx, ty), text, fill=WHITE, font=font)
    except Exception:
        pass
    
    return img


def generate_foreground(size=512):
    """Generate Android adaptive icon foreground."""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    cx, cy = size // 2, size // 2
    
    # Shield
    shield_size = size * 0.85
    draw_shield(draw, cx, cy, shield_size, fill_color=BLUE)
    draw_shield(draw, cx, cy, shield_size * 0.88, fill_color=(25, 110, 200))
    
    # Candles
    chart_cy = cy - size * 0.02
    chart_h = shield_size * 0.35
    candle_w = int(size * 0.055)
    
    candles = [
        (chart_cy - chart_h * 0.15, chart_h * 0.5, True),
        (chart_cy + chart_h * 0.1, chart_h * 0.35, False),
        (chart_cy - chart_h * 0.05, chart_h * 0.6, True),
        (chart_cy - chart_h * 0.2, chart_h * 0.45, True),
        (chart_cy + chart_h * 0.15, chart_h * 0.3, False),
    ]
    
    total_w = candle_w * 5 + (size * 0.035) * 4
    start_x = cx - total_w // 2
    
    for i, (cy_i, h_i, is_green) in enumerate(candles):
        x = start_x + i * (candle_w + size * 0.035) + candle_w // 2
        draw_candlestick(draw, x, cy_i, int(h_i), int(h_i * 1.5), is_green,
                        wick_w=max(2, size // 200), body_w=candle_w)
    
    # Checkmark
    check_cy = cy + shield_size * 0.22
    check_size = shield_size * 0.3
    draw_checkmark(draw, cx, check_cy, check_size, color=GOLD, width=max(3, size // 130))
    
    # TDO text
    try:
        font_size = int(size * 0.085)
        font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', font_size)
        text = "TDO"
        bbox = draw.textbbox((0, 0), text, font=font)
        tw = bbox[2] - bbox[0]
        draw.text((cx - tw // 2, cy + shield_size * 0.38), text, fill=WHITE, font=font)
    except Exception:
        pass
    
    return img


def generate_background(size=512):
    """Generate Android adaptive icon background."""
    img = Image.new('RGB', (size, size), NAVY)
    draw = ImageDraw.Draw(img)
    
    # Subtle radial gradient effect
    cx, cy = size // 2, size // 2
    for r in range(size // 2, 0, -2):
        ratio = r / (size // 2)
        c = tuple(int(NAVY[i] + (BLUE[i] - NAVY[i]) * (1 - ratio) * 0.15) for i in range(3))
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=c)
    
    # Subtle grid pattern (trading feel)
    for i in range(0, size, size // 12):
        opacity_line = (32, 138, 239) if i % (size // 6) == 0 else (20, 60, 100)
        draw.line([(i, 0), (i, size)], fill=opacity_line, width=1)
        draw.line([(0, i), (size, i)], fill=opacity_line, width=1)
    
    return img


def generate_monochrome(size=432):
    """Generate monochrome icon."""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    cx, cy = size // 2, size // 2
    
    # Shield
    shield_size = size * 0.9
    draw_shield(draw, cx, cy, shield_size, fill_color=WHITE)
    
    # Candles
    chart_cy = cy - size * 0.02
    chart_h = shield_size * 0.35
    candle_w = int(size * 0.055)
    
    candles = [
        (chart_cy - chart_h * 0.15, chart_h * 0.5, True),
        (chart_cy + chart_h * 0.1, chart_h * 0.35, False),
        (chart_cy - chart_h * 0.05, chart_h * 0.6, True),
        (chart_cy - chart_h * 0.2, chart_h * 0.45, True),
        (chart_cy + chart_h * 0.15, chart_h * 0.3, False),
    ]
    
    total_w = candle_w * 5 + (size * 0.035) * 4
    start_x = cx - total_w // 2
    
    for i, (cy_i, h_i, is_green) in enumerate(candles):
        x = start_x + i * (candle_w + size * 0.035) + candle_w // 2
        draw_candlestick(draw, x, cy_i, int(h_i), int(h_i * 1.5), is_green,
                        wick_w=max(2, size // 200), body_w=candle_w, 
                        color_override=NAVY)
    
    # Checkmark
    check_cy = cy + shield_size * 0.22
    check_size = shield_size * 0.3
    draw_checkmark(draw, cx, check_cy, check_size, color=(200, 200, 200), width=max(3, size // 130))
    
    return img


def generate_favicon(size=48):
    """Generate favicon."""
    # Scale down from a larger version
    main = generate_main_icon(256)
    return main.resize((size, size), Image.LANCZOS)


def generate_splash(width=228, height=213):
    """Generate splash icon."""
    # Create a 2x version and resize
    main = generate_main_icon(max(width, height) * 2)
    return main.resize((width, height), Image.LANCZOS)


def main():
    os.makedirs(OUT, exist_ok=True)
    
    print("🎨 Generating icons for Trading Discipline OS...")
    
    # 1. Main icon (1024x1024)
    icon = generate_main_icon(1024)
    icon_path = os.path.join(OUT, 'icon.png')
    icon.convert('RGB').save(icon_path, 'PNG', optimize=True)
    print(f"  ✅ icon.png (1024x1024)")
    
    # 2. Android foreground (512x512)
    fg = generate_foreground(512)
    fg_path = os.path.join(OUT, 'android-icon-foreground.png')
    fg.save(fg_path, 'PNG', optimize=True)
    print(f"  ✅ android-icon-foreground.png (512x512)")
    
    # 3. Android background (512x512)
    bg = generate_background(512)
    bg_path = os.path.join(OUT, 'android-icon-background.png')
    bg.save(bg_path, 'PNG', optimize=True)
    print(f"  ✅ android-icon-background.png (512x512)")
    
    # 4. Monochrome (432x432)
    mono = generate_monochrome(432)
    mono_path = os.path.join(OUT, 'android-icon-monochrome.png')
    mono.save(mono_path, 'PNG', optimize=True)
    print(f"  ✅ android-icon-monochrome.png (432x432)")
    
    # 5. Favicon (48x48)
    fav = generate_favicon(48)
    fav_path = os.path.join(OUT, 'favicon.png')
    fav.convert('RGB').save(fav_path, 'PNG', optimize=True)
    print(f"  ✅ favicon.png (48x48)")
    
    # 6. Splash icon (228x213)
    splash = generate_splash(228, 213)
    splash_path = os.path.join(OUT, 'splash-icon.png')
    splash.save(splash_path, 'PNG', optimize=True)
    print(f"  ✅ splash-icon.png (228x213)")
    
    print("\n🎉 All icons generated!")
    print(f"📁 Output: {os.path.abspath(OUT)}")


if __name__ == '__main__':
    main()
