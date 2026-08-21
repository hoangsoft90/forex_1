#!/usr/bin/env python3
"""
Generate Feature Graphic (1024x500) for Trading Discipline OS.
Design: Dark navy background + white text + brand elements.
"""
from PIL import Image, ImageDraw, ImageFont
import os

OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'images')

# Brand colors
NAVY = (13, 43, 82)
DARK_NAVY = (8, 25, 50)
BLUE = (32, 138, 239)
GREEN = (34, 197, 94)
RED = (239, 68, 68)
WHITE = (255, 255, 255)
GOLD = (255, 215, 0)
LIGHT_GRAY = (200, 210, 225)

W, H = 1024, 500


def draw_shield(draw, cx, cy, size, fill_color):
    w, h = size * 0.45, size * 0.52
    top_y = cy - h * 0.45
    bot_y = cy + h * 0.55
    shield_points = [
        (cx - w * 0.95, top_y + h * 0.1),
        (cx - w * 0.7, top_y),
        (cx + w * 0.7, top_y),
        (cx + w * 0.95, top_y + h * 0.1),
        (cx + w * 0.85, cy + h * 0.15),
        (cx + w * 0.5, cy + h * 0.45),
        (cx, bot_y),
        (cx - w * 0.5, cy + h * 0.45),
        (cx - w * 0.85, cy + h * 0.15),
    ]
    draw.polygon(shield_points, fill=fill_color)


def draw_candlestick(draw, x, cy, body_h, is_green=True, body_w=12, wick_w=2):
    color = GREEN if is_green else RED
    body_top = cy - body_h // 2
    body_bot = cy + body_h // 2
    wick_h = int(body_h * 1.8)
    wick_top = cy - wick_h // 2
    wick_bot = cy + wick_h // 2
    draw.line([(x, wick_top), (x, wick_bot)], fill=color, width=wick_w)
    draw.rectangle([x - body_w // 2, body_top, x + body_w // 2, body_bot], fill=color)


def draw_checkmark(draw, cx, cy, size, color=GOLD, width=4):
    s = size * 0.35
    points = [
        (cx - s * 0.6, cy),
        (cx - s * 0.1, cy + s * 0.5),
        (cx + s * 0.7, cy - s * 0.5),
    ]
    draw.line(points, fill=color, width=width, joint='curve')


def get_font(size):
    paths = [
        '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
        '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
        '/usr/share/fonts/TTF/DejaVuSans-Bold.ttf',
    ]
    for p in paths:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def main():
    os.makedirs(OUT, exist_ok=True)

    img = Image.new('RGB', (W, H), DARK_NAVY)
    draw = ImageDraw.Draw(img)

    # === Background: subtle gradient overlay ===
    for y in range(H):
        ratio = y / H
        r = int(DARK_NAVY[0] + (NAVY[0] - DARK_NAVY[0]) * ratio)
        g = int(DARK_NAVY[1] + (NAVY[1] - DARK_NAVY[1]) * ratio)
        b = int(DARK_NAVY[2] + (NAVY[2] - DARK_NAVY[2]) * ratio)
        draw.line([(0, y), (W, y)], fill=(r, g, b))

    # === Subtle grid lines (trading chart feel) ===
    for x in range(0, W, W // 16):
        draw.line([(x, 0), (x, H)], fill=(20, 50, 85), width=1)
    for y in range(0, H, H // 10):
        draw.line([(0, y), (W, y)], fill=(20, 50, 85), width=1)

    # === Left side: Text content ===
    left_margin = 60
    text_x = left_margin
    text_w = 560

    # Title: "Trading Discipline OS"
    title_font = get_font(42)
    draw.text((text_x, 45), "Trading", fill=WHITE, font=title_font)
    title_w = draw.textbbox((0, 0), "Trading", font=title_font)[2]
    draw.text((text_x + title_w + 12, 45), "Discipline", fill=BLUE, font=title_font)
    disc_w = draw.textbbox((0, 0), "Discipline", font=title_font)[2]
    draw.text((text_x + title_w + disc_w + 24, 45), "OS", fill=WHITE, font=title_font)

    # Tagline
    tag_font = get_font(20)
    draw.text((text_x, 100), "Your Personal Trading Constitution", fill=LIGHT_GRAY, font=tag_font)

    # Accent line
    draw.rectangle([text_x, 140, text_x + 80, 144], fill=BLUE)

    # Feature bullets
    bullet_font = get_font(18)
    features = [
        ("Risk Engine", "37 forex pairs, commodities, indices, crypto"),
        ("Trading Constitution", "Set rules, auto-check, break-prevention"),
        ("Discipline Score", "Track your consistency, see real progress"),
        ("Cost of Indiscipline", "See exactly what rule-breaking costs you"),
        ("Smart Alerts", "Morning brief, evening review, danger zone"),
    ]
    y = 165
    for label, desc in features:
        # Blue bullet dot
        draw.ellipse([text_x, y + 5, text_x + 8, y + 13], fill=BLUE)
        draw.text((text_x + 16, y), label, fill=WHITE, font=bullet_font)
        label_w = draw.textbbox((0, 0), label, font=bullet_font)[2]
        draw.text((text_x + label_w + 22, y), f"— {desc}", fill=LIGHT_GRAY, font=bullet_font)
        y += 30

    # Bottom tagline
    bottom_font = get_font(15)
    draw.text((text_x, H - 55), "Plan  •  Execute  •  Review  —  Build Unbreakable Habits",
              fill=LIGHT_GRAY, font=bottom_font)

    # Free badge
    badge_font = get_font(16)
    draw.rounded_rectangle([text_x, H - 30, text_x + 180, H - 8], radius=4, fill=BLUE)
    draw.text((text_x + 12, H - 28), "FREE — Pro via Rewarded Ads", fill=WHITE, font=badge_font)

    # === Right side: Shield + Candlesticks ===
    shield_cx = W - 180
    shield_cy = H // 2 - 10
    shield_size = 280

    # Shield glow (subtle blue circle behind shield)
    for r in range(120, 0, -2):
        alpha_ratio = 1 - (r / 120)
        glow_color = (
            int(DARK_NAVY[0] + (BLUE[0] - DARK_NAVY[0]) * alpha_ratio * 0.15),
            int(DARK_NAVY[1] + (BLUE[1] - DARK_NAVY[1]) * alpha_ratio * 0.15),
            int(DARK_NAVY[2] + (BLUE[2] - DARK_NAVY[2]) * alpha_ratio * 0.15),
        )
        draw.ellipse([shield_cx - r, shield_cy - r, shield_cx + r, shield_cy + r],
                     fill=glow_color)

    # Shield
    draw_shield(draw, shield_cx, shield_cy, shield_size, fill_color=BLUE)
    draw_shield(draw, shield_cx, shield_cy, shield_size * 0.88, fill_color=(25, 110, 200))

    # Candlesticks inside shield
    chart_cy = shield_cy - 15
    candle_w = 14
    candles_data = [
        (chart_cy - 30, 40, True),
        (chart_cy + 10, 28, False),
        (chart_cy - 10, 50, True),
        (chart_cy - 35, 35, True),
        (chart_cy + 15, 25, False),
    ]
    total_candle_w = candle_w * 5 + 10 * 4
    start_cx = shield_cx - total_candle_w // 2
    for i, (cy_i, h_i, is_green) in enumerate(candles_data):
        x = start_cx + i * (candle_w + 10) + candle_w // 2
        draw_candlestick(draw, x, cy_i, h_i, is_green, body_w=candle_w, wick_w=2)

    # Checkmark
    draw_checkmark(draw, shield_cx, shield_cy + 75, 80, color=GOLD, width=5)

    # === Bottom accent bar ===
    draw.rectangle([0, H - 4, W, H], fill=BLUE)

    # === Save ===
    out_path = os.path.join(OUT, 'feature-graphic.png')
    img.save(out_path, 'PNG', optimize=True)
    print(f"✅ feature-graphic.png ({W}x{H}) saved to {out_path}")


if __name__ == '__main__':
    main()
