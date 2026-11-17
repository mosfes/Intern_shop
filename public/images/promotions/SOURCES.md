# Promotional product cutouts

Transparent-background derivatives made with ImageGen from the existing JIB-sourced product photography. Original photos and source URLs are retained in `src/data/product-photo-sources.json`.

- gpu-transparent: ASUS TUF RTX 5070, original `asus-tuf-geforce-rtx-5070/1.webp`
- cpu-transparent: Ryzen 7 9800X3D angled box, original `amd-ryzen-7-9800x3d/3.webp`
- monitor-transparent: LG UltraGear OLED, original `lg-ultragear-27-oled-240hz/1.webp`
- ssd-transparent: Samsung 990 PRO, original `samsung-990-pro-2tb/1.webp`
- mouse-transparent: Logitech G PRO X SUPERLIGHT 2, original `logitech-g-pro-x-superlight-2/1.webp`

- motherboard-transparent: ASUS ROG Strix X870E-E motherboard, retail box and antenna, original `asus-rog-strix-x870e-e-gaming-wifi/1.webp`
- cooling-transparent: ARCTIC Liquid Freezer III 360 RGB, original `arctic-liquid-freezer-iii-360/1.webp`

PNG masters retain alpha; WebP versions are used by the website.

## Login artwork

- `auth-clean-shadow-lossless.webp`: current account artwork; built-in ImageGen edit removing rough exterior shadow mattes, with subtle theme-specific CSS shadows applied at display time. Transparent lossless WebP. Prompt: `output/imagegen/auth-shadow-cleanup-prompt.md`. Master: `exec-950acd7c-b5aa-4bf3-b97a-e0ef8448b4b1.png`.

- `auth-msi-box-fixed-lossless.webp`: current account artwork; built-in ImageGen local edit correcting the MSI retail box proportions, perspective and front-print layout against the real MSI Gaming Trio reference. Lossless alpha WebP served directly. Generated illustration. Prompt: `output/imagegen/auth-msi-box-prompt.md`. Master: `exec-eb5d84bd-c559-4c33-930a-50478d052b3c.png`.

- `auth-mixed-brands-lossless.webp`: current account artwork; built-in ImageGen edit with MSI Gaming Trio GPU/packaging, NZXT cooler and Kingston FURY memory references, retaining AMD CPU packaging and ASUS motherboard. Transparent lossless WebP served directly. Generated illustration. Prompt: `output/imagegen/auth-mixed-brands-prompt.md`. Master: `exec-17ebd278-c86f-4d94-ae9b-6a5b4e1c2ed6.png`.

- `auth-pc-boxes-lossless.webp`: current account artwork; built-in ImageGen with real packaging references, assembled glass gaming tower with visible internals and CPU/GPU/motherboard retail boxes replacing loose parts. Lossless transparent WebP served directly. Generated illustration. Prompt: `output/imagegen/auth-pc-boxes-prompt.md`. Master: `exec-c1a2bcd3-1982-41c6-9d6b-717a4782cdaa.png`.

- `auth-front-case-lossless.webp`: current account artwork; built-in ImageGen edit rotating the case toward the viewer with a front-facing three-fan panel and receding glass side, preserving flat loose components and CPU engraving. Lossless alpha WebP served directly. Prompt: `output/imagegen/auth-front-case-prompt.md`. Master: `exec-dac36792-f65d-4dc3-bc01-177db36bab82.png`.

- `auth-flat-components-lossless.webp`: current account artwork; built-in ImageGen edit using an elevated camera and all loose components lying flat on a shared plane next to the standing case, with translucent contact shadows. Lossless alpha WebP served directly. Prompt: `output/imagegen/auth-flat-components-prompt.md`. Master: `exec-1e66119c-216b-4254-bdbd-51ec86ab4c20.png`.

- `auth-grounded-case-lossless.webp`: current account artwork; built-in ImageGen edit correcting the case position to sit alongside the components with its feet on the shared baseline. Landscape transparent composition, engraved CPU retained, lossless encoding with no further image optimization. Prompt: `output/imagegen/auth-grounded-case-prompt.md`. Master: `exec-f2340492-f3b9-48ce-b570-7b77ed50f443.png`.

- `auth-case-cpu-lossless.webp`: current account artwork; built-in ImageGen edit adding a Lian Li O11-inspired gaming tower from the original case photograph and CPU engraving `AMD / RYZEN 7 / 9800X3D`. Generated illustration with transparent alpha, encoded losslessly and served directly. Prompt: `output/imagegen/auth-case-cpu-prompt.md`. Master: `exec-2bb16dfc-91da-44fc-abd2-6ffba40acb8c.png`.

- `auth-hardware-theme-lossless.webp`: current account artwork, encoded losslessly from the original v4 PNG at 1122×1402 with alpha. The account page serves it directly without further resizing or quality compression. Same generation prompt and source as v4 below.

- `auth-hardware-theme-v4.webp`: current account artwork; built-in ImageGen with product references, transparent alpha, orange/white lighting, and a plain silver CPU chip instead of retail packaging. Background and logo use site theme tokens. Generated illustration. Prompt: `output/imagegen/auth-theme-prompt.md`. Master: `exec-bad6cf4c-d627-4c9d-8def-aa44fa37e369.png`.

- `auth-gaming-v3.webp`: current account artwork; built-in ImageGen with the same five real product references, dark gaming setup with cyan/orange RGB. Generated illustration, not an original physical product photograph. Prompt: `output/imagegen/auth-gaming-prompt.md`. Master: `exec-82d146f7-c314-40d9-abec-5f75ed49d229.png`.

- `auth-hardware-photo-v2.webp`: current account artwork generated with built-in ImageGen, using the five GPU, motherboard, cooler, CPU and SSD product cutouts above as identity references. A generated photographic illustration, not an original photograph of a physical setup. Prompt: `output/imagegen/auth-hardware-photo-prompt.md`. Master: `exec-d096febd-aeb1-442e-9545-4ec3391f6a09.png`.

- `auth-hardware-scene.webp`: original artwork created with built-in ImageGen for the account pages. One unified studio scene depicting generic computer components; no product-model claims. Source master: `exec-092fb901-682d-4183-a291-7d7c84baf9a3.png`. Generation prompt: `output/imagegen/auth-hardware-prompt.md`.
