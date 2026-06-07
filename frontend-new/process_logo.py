from PIL import Image
import os

img_path = r"C:\Users\L\.gemini\antigravity\brain\f441fcdf-dfdf-4a5d-856c-8325e1144b49\voxa_new_logo_1779479314345.png"
if not os.path.exists(img_path):
    print("Image not found")
    exit(1)

img = Image.open(img_path).convert("RGBA")
datas = img.getdata()

# Find the background color (assume top-left pixel is background)
bg_color = datas[0]
print(f"Background color appears to be: {bg_color}")

newData = []
for item in datas:
    # If the pixel is very close to the background color, make it transparent
    if abs(item[0] - bg_color[0]) < 30 and abs(item[1] - bg_color[1]) < 30 and abs(item[2] - bg_color[2]) < 30:
        newData.append((255, 255, 255, 0))
    else:
        newData.append(item)

img.putdata(newData)

# Let's crop it to remove empty transparent space
bbox = img.getbbox()
if bbox:
    img = img.crop(bbox)

out_path = r"D:\Projects_work\voxa\frontend-new\public\voxa-v-logo.png"
img.save(out_path, "PNG")
print(f"Saved transparent logo to {out_path}")
