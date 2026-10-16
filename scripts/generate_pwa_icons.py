import os
from PIL import Image, ImageDraw, ImageFilter

def create_ghost_icon(size, is_maskable=False, is_ios=False):
    # Render at 4x resolution for smooth supersampling antialiasing
    scale = 4
    canvas_size = size * scale
    img = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Background
    bg_color_top = (15, 23, 42)      # Slate 900
    bg_color_bottom = (30, 27, 75)   # Deep indigo 950

    if is_maskable or is_ios:
        # Full background without transparency
        for y in range(canvas_size):
            ratio = y / canvas_size
            r = int(bg_color_top[0] * (1 - ratio) + bg_color_bottom[0] * ratio)
            g = int(bg_color_top[1] * (1 - ratio) + bg_color_bottom[1] * ratio)
            b = int(bg_color_top[2] * (1 - ratio) + bg_color_bottom[2] * ratio)
            draw.line([(0, y), (canvas_size, y)], fill=(r, g, b, 255))
    else:
        # Rounded squircle for standard icon
        corner_radius = int(canvas_size * 0.22)
        bg = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
        bg_draw = ImageDraw.Draw(bg)
        for y in range(canvas_size):
            ratio = y / canvas_size
            r = int(bg_color_top[0] * (1 - ratio) + bg_color_bottom[0] * ratio)
            g = int(bg_color_top[1] * (1 - ratio) + bg_color_bottom[1] * ratio)
            b = int(bg_color_top[2] * (1 - ratio) + bg_color_bottom[2] * ratio)
            bg_draw.line([(0, y), (canvas_size, y)], fill=(r, g, b, 255))
        
        # Mask with rounded rectangle
        mask = Image.new("L", (canvas_size, canvas_size), 0)
        mask_draw = ImageDraw.Draw(mask)
        mask_draw.rounded_rectangle([0, 0, canvas_size, canvas_size], radius=corner_radius, fill=255)
        img.paste(bg, (0, 0), mask)

    # Glow effect behind the ghost
    glow = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    cx, cy = canvas_size // 2, int(canvas_size * 0.48)
    glow_radius = int(canvas_size * (0.28 if not is_maskable else 0.22))
    
    # Radial glow
    for r in range(glow_radius, 0, -6):
        alpha = int(45 * (1 - r / glow_radius))
        glow_draw.ellipse(
            [cx - r, cy - r, cx + r, cy + r],
            fill=(129, 140, 248, alpha) # Indigo 400 with alpha
        )
    glow = glow.filter(ImageFilter.GaussianBlur(12 * scale))
    img.alpha_composite(glow)

    # Draw Ghost
    # Safe zone for maskable icons: safe within 80% circle (i.e. scale = 0.65)
    content_scale = 0.58 if is_maskable else 0.72
    w = int(canvas_size * content_scale)
    h = int(w * 1.15)
    
    gx1 = (canvas_size - w) // 2
    gy1 = (canvas_size - h) // 2 - int(canvas_size * 0.02)
    gx2 = gx1 + w
    gy2 = gy1 + h

    ghost_layer = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    g_draw = ImageDraw.Draw(ghost_layer)

    # Head & upper body
    head_r = w // 2
    # Semi-circle head: gx1, gy1, gx2, gy1 + 2*head_r
    # We will build a smooth polygon for ghost
    # Head arc: from 180 to 360 deg
    head_box = [gx1, gy1, gx2, gy1 + 2 * head_r]
    
    # Body points:
    points = []
    import math
    # Upper head arc
    steps = 40
    for i in range(steps + 1):
        angle = math.pi + (math.pi * i / steps)
        px = cx + (w / 2) * math.cos(angle)
        py = (gy1 + head_r) + (head_r * 0.95) * math.sin(angle)
        points.append((px, py))
    
    # Right side down
    body_bottom = gy1 + h
    points.append((gx2, body_bottom - (w * 0.12)))
    
    # Scalloped bottom waves (3 scallops)
    num_waves = 3
    wave_width = w / num_waves
    wave_depth = w * 0.14
    for i in range(num_waves, 0, -1):
        x_right = gx1 + i * wave_width
        x_left = gx1 + (i - 1) * wave_width
        x_mid = (x_right + x_left) / 2
        # Curve down and back up
        points.append((x_right - wave_width * 0.25, body_bottom))
        points.append((x_mid, body_bottom - wave_depth))
        points.append((x_left + wave_width * 0.25, body_bottom))
        points.append((x_left, body_bottom - (w * 0.12)))
    
    # Left side up already closed to first point
    
    # Fill ghost with gradient or solid white with purple rim
    g_draw.polygon(points, fill=(248, 250, 252, 255)) # Slate 50
    
    # Add subtle shading/gradient to ghost body
    ghost_gradient = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    gg_draw = ImageDraw.Draw(ghost_gradient)
    for y in range(int(gy1), int(body_bottom + 1)):
        ratio = (y - gy1) / (body_bottom - gy1)
        r = int(248 * (1 - ratio * 0.15) + 165 * ratio * 0.15) # blend towards violet
        g = int(250 * (1 - ratio * 0.20) + 180 * ratio * 0.20)
        b = int(252)
        gg_draw.line([(gx1, y), (gx2, y)], fill=(r, g, b, 255))
    
    # Mask gradient to ghost shape
    ghost_mask = Image.new("L", (canvas_size, canvas_size), 0)
    ImageDraw.Draw(ghost_mask).polygon(points, fill=255)
    ghost_layer.paste(ghost_gradient, (0, 0), ghost_mask)

    # Eyes
    eye_w = int(w * 0.12)
    eye_h = int(eye_w * 1.45)
    eye_y = int(gy1 + head_r * 0.82)
    eye_spacing = int(w * 0.22)
    left_eye_x = cx - eye_spacing // 2 - eye_w
    right_eye_x = cx + eye_spacing // 2

    # Draw dark eyes
    eye_color = (15, 23, 42) # Slate 900
    ImageDraw.Draw(ghost_layer).ellipse([left_eye_x, eye_y, left_eye_x + eye_w, eye_y + eye_h], fill=eye_color)
    ImageDraw.Draw(ghost_layer).ellipse([right_eye_x, eye_y, right_eye_x + eye_w, eye_y + eye_h], fill=eye_color)

    # Eye glints (cute little white dots)
    glint_size = max(2 * scale, eye_w // 3)
    ImageDraw.Draw(ghost_layer).ellipse([left_eye_x + eye_w // 4, eye_y + eye_h // 4, left_eye_x + eye_w // 4 + glint_size, eye_y + eye_h // 4 + glint_size], fill=(255, 255, 255, 240))
    ImageDraw.Draw(ghost_layer).ellipse([right_eye_x + eye_w // 4, eye_y + eye_h // 4, right_eye_x + eye_w // 4 + glint_size, eye_y + eye_h // 4 + glint_size], fill=(255, 255, 255, 240))

    # Cute little blush dots
    blush_w = int(eye_w * 1.3)
    blush_h = int(blush_w * 0.5)
    blush_y = eye_y + eye_h + int(scale * 3)
    ImageDraw.Draw(ghost_layer).ellipse([left_eye_x - int(scale * 3), blush_y, left_eye_x - int(scale * 3) + blush_w, blush_y + blush_h], fill=(236, 72, 153, 90))
    ImageDraw.Draw(ghost_layer).ellipse([right_eye_x + eye_w - blush_w + int(scale * 3), blush_y, right_eye_x + eye_w + int(scale * 3), blush_y + blush_h], fill=(236, 72, 153, 90))

    img.alpha_composite(ghost_layer)

    # Downscale using high quality Lanczos filter for crisp anti-aliasing
    final_img = img.resize((size, size), Image.Resampling.LANCZOS)
    return final_img

def main():
    public_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "public"))
    os.makedirs(public_dir, exist_ok=True)
    
    icons_to_make = [
        ("icon-192.png", 192, False, False),
        ("icon-512.png", 512, False, False),
        ("icon-maskable-192.png", 192, True, False),
        ("icon-maskable-512.png", 512, True, False),
        ("apple-touch-icon.png", 180, False, True),
        ("favicon-32x32.png", 32, False, False),
        ("favicon-16x16.png", 16, False, False)
    ]
    
    for filename, size, maskable, is_ios in icons_to_make:
        out_path = os.path.join(public_dir, filename)
        icon = create_ghost_icon(size, is_maskable=maskable, is_ios=is_ios)
        icon.save(out_path, format="PNG")
        print(f"Generated {filename} ({size}x{size})")

if __name__ == "__main__":
    main()
