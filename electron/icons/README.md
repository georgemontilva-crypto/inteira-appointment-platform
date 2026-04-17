## Íconos de la app

| Archivo | Tamaño | Plataforma | Estado |
|---|---|---|---|
| `source.png` | 2134×2134 | — | Fuente original (R2) |
| `icon.png` | 512×512 | Linux / fallback | Generado |
| `icon.ico` | 256×256 | Windows | Generado (PNG-in-ICO) |
| `icon.icns` | multi | macOS | Generar en Mac (ver abajo) |

## Regenerar íconos

```bash
# Desde la carpeta electron/
npm run icons:generate
```

## Generar icon.icns (solo en macOS)

```bash
bash scripts/generate-icns.sh
```

Requiere `sips` e `iconutil` (incluidos en macOS).
