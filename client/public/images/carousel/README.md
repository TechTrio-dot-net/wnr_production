# Carousel Images

## Storage Optimization Tips

To minimize storage usage, follow these guidelines:

1. **Use optimized image formats:**
   - Convert images to WebP format (smaller file size)
   - Use JPEG with quality 80-85% for good balance

2. **Recommended image dimensions:**
   - Maximum width: 1920px (will be automatically resized by Next.js)
   - Aspect ratio: 16:9 (required for carousel)
   - File size: Try to keep each image under 500KB

3. **Image optimization tools:**
   - Use tools like `sharp-cli` or online tools like Squoosh.app
   - Compress images before uploading here

4. **Next.js will automatically:**
   - Convert to WebP/AVIF format for modern browsers
   - Resize based on device size
   - Cache optimized versions (reduces repeated processing)
   - Serve appropriate sizes to reduce bandwidth

## File Names

Place your images with these exact names:
- `carousel-1.jpg`
- `carousel-2.jpg`
- `carousel-3.jpg`
- `carousel-4.jpg`
- `carousel-5.jpg`

## Example Optimization Command (if you have ImageMagick or similar)

```bash
# Convert and compress images
for i in {1..5}; do
  convert original-${i}.jpg -resize 1920x1080^ -quality 85 -strip carousel-${i}.jpg
done
```

