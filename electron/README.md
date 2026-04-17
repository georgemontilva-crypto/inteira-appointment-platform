# Inteira Desktop

App de escritorio para Inteira — envuelve `https://inteira.app` en una ventana nativa usando Electron.

## Instalar dependencias

```bash
cd electron
npm install
```

## Probar en desarrollo

```bash
npm start
```

## Generar instalador Windows (.exe)

```bash
npm run build:win
```

## Generar instalador Mac (.dmg)

```bash
npm run build:mac
```

Los archivos generados quedan en `electron/dist/`.

## Íconos

Antes de generar los instaladores, coloca los íconos en `electron/icons/`:

| Archivo | Tamaño | Plataforma |
|---|---|---|
| `icon.png` | 512×512 | Linux / fallback |
| `icon.ico` | 256×256 | Windows |
| `icon.icns` | 512×512 | macOS |

## Notas

- `main.cjs` y `preload.cjs` usan CommonJS explícito (extensión `.cjs`) para evitar conflicto con el `"type": "module"` del proyecto principal.
- Esta carpeta es completamente independiente — tiene su propio `node_modules` y no afecta el proyecto web.
