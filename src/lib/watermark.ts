export function createWatermarkedThumbnail(
  file: File,
  watermarkText: string = "LIU RECORD",
  maxWidth: number = 1000,
  maxHeight: number = 1000
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions keeping aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }

        // Draw the image
        ctx.drawImage(img, 0, 0, width, height);

        // Draw repeating watermark grid
        ctx.save();
        
        // Font configuration - dynamically sized based on image width
        const fontSize = Math.max(12, Math.round(width / 20));
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.fillStyle = "rgba(255, 255, 255, 0.22)"; // Semi-transparent white
        ctx.strokeStyle = "rgba(0, 0, 0, 0.15)"; // Semi-transparent black outline for legibility
        ctx.lineWidth = 1;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // Rotate the context to draw diagonal watermarks
        const angle = -30 * Math.PI / 180;
        
        // Set steps for the grid of text to fill the canvas
        const stepX = Math.round(width / 2.5);
        const stepY = Math.round(height / 3);

        for (let x = -stepX; x < width + stepX; x += stepX) {
          for (let y = -stepY; y < height + stepY; y += stepY) {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(angle);
            // Draw filled text
            ctx.fillText(watermarkText, 0, 0);
            // Draw text outline
            ctx.strokeText(watermarkText, 0, 0);
            ctx.restore();
          }
        }
        
        ctx.restore();

        // Convert canvas to Blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Canvas export failed"));
            }
          },
          "image/jpeg",
          0.82 // Compression quality (82% matches standard high quality compression)
        );
      };
      img.onerror = (err) => reject(err);
      img.src = e.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}
