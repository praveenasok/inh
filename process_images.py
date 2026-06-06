import os
import glob
from PIL import Image, ImageEnhance, ImageFilter
from rembg import remove

source_dir = '/Users/praveenasok/Desktop/inhsuite/images/Products/'
target_width = 232
target_height = 533

# Create a backup directory just in case
backup_dir = '/Users/praveenasok/Desktop/inhsuite/images/Products_Backup/'
if not os.path.exists(backup_dir):
    os.makedirs(backup_dir)

files = glob.glob(os.path.join(source_dir, '*.png')) + glob.glob(os.path.join(source_dir, '*.jpg'))

print(f"Found {len(files)} files to process.")

for i, file_path in enumerate(files):
    filename = os.path.basename(file_path)
    backup_path = os.path.join(backup_dir, filename)
    
    # Backup if not already backed up
    if not os.path.exists(backup_path):
        import shutil
        shutil.copy2(file_path, backup_path)
    
    try:
        print(f"[{i+1}/{len(files)}] Processing {filename}...")
        
        # We process from the original backup to prevent double-processing or degradation if script run multiple times
        img = Image.open(backup_path).convert('RGBA')
        
        # Background Removal
        img = remove(img)
        
        # Crop to bounding box to remove excess transparent space
        bbox = img.getbbox()
        if bbox:
            img = img.crop(bbox)
            
        # Resize to fit within 232x533 maintaining aspect ratio
        img.thumbnail((target_width, target_height), Image.Resampling.LANCZOS)
        
        # Create a transparent canvas of exactly 232x533
        new_img = Image.new("RGBA", (target_width, target_height), (0, 0, 0, 0))
        
        # Center paste
        paste_x = (target_width - img.width) // 2
        paste_y = (target_height - img.height) // 2
        new_img.paste(img, (paste_x, paste_y), img)
        
        # Sharpen and increase contrast (sharp and in focus)
        new_img = new_img.filter(ImageFilter.UnsharpMask(radius=2, percent=150, threshold=3))
        
        # Optionally, improve contrast slightly
        enhancer = ImageEnhance.Contrast(new_img)
        new_img = enhancer.enhance(1.1)
        
        # Save back to original location, forcing PNG extension (rembg requires RGBA and PNG preserves transparency)
        save_path = os.path.splitext(file_path)[0] + '.png'
        new_img.save(save_path, "PNG")
        
        # If it was a jpg originally, we should remove the jpg so we only have the png
        if file_path.lower().endswith('.jpg') and file_path != save_path:
            os.remove(file_path)
            
    except Exception as e:
        print(f"Error processing {filename}: {e}")

print("Done processing all images.")
