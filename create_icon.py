from PIL import Image, ImageDraw
import math

def create_studio_icon():
    size = 256
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Outer squircle / rounded rectangle with gradient feel
    margin = 12
    corner_r = 52
    
    # Background rounded rect
    draw.rounded_rectangle(
        [margin, margin, size - margin, size - margin],
        radius=corner_r,
        fill=(15, 23, 42, 255), # slate-900
        outline=(99, 102, 241, 230), # indigo-500
        width=6
    )

    # Inner subtle glow circle
    cx, cy = size // 2, size // 2
    for r in range(80, 20, -10):
        alpha = int(25 * (r / 80))
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(79, 70, 229, alpha))

    # Soundwave bars (left and right of mic)
    bars = [
        (62, 50, (56, 189, 248)),   # sky-400
        (82, 75, (99, 102, 241)),   # indigo-400
        (174, 75, (99, 102, 241)),  # indigo-400
        (194, 50, (56, 189, 248)),  # sky-400
    ]
    for bx, h, col in bars:
        draw.rounded_rectangle([bx - 6, cy - h // 2, bx + 6, cy + h // 2], radius=6, fill=col)

    # Microphone central body
    # Mic capsule
    mic_w = 40
    mic_top = 66
    mic_bot = 142
    draw.rounded_rectangle(
        [cx - mic_w // 2, mic_top, cx + mic_w // 2, mic_bot],
        radius=20,
        fill=(248, 250, 252), # white-slate
        outline=(56, 189, 248),
        width=3
    )

    # Inner mic grill lines
    for gy in [85, 97, 109, 121]:
        draw.line([cx - 12, gy, cx + 12, gy], fill=(148, 163, 184), width=3)

    # Mic stand cradle arc (U-shape)
    arc_box = [cx - 32, 100, cx + 32, 164]
    draw.arc(arc_box, start=0, end=180, fill=(245, 158, 11), width=6) # amber-500

    # Stand vertical pole
    draw.line([cx, 164, cx, 192], fill=(245, 158, 11), width=6)

    # Stand base horizontal
    draw.line([cx - 30, 192, cx + 30, 192], fill=(245, 158, 11), width=6)

    # Generate multi-size icon
    icon_sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    img.save("app_icon.ico", format="ICO", sizes=icon_sizes)
    img.save("app_icon.png", format="PNG")
    print("app_icon.ico successfully created with multi-resolutions!")

if __name__ == "__main__":
    create_studio_icon()
