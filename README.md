[![NPM version](https://img.shields.io/npm/v/@file-type/av.svg)](https://npmjs.org/package/@file-type/av)
[![Node.js CI](https://github.com/Borewit/file-type-av/actions/workflows/nodejs-ci.yml/badge.svg)](https://github.com/Borewit/file-type-av/actions/workflows/nodejs-ci.yml)
[![npm downloads](https://img.shields.io/npm/dm/@file-type/av.svg)](https://npmcharts.com/compare/@file-type/av?start=365)

# @file-type/av

A plugin for [file-type](https://github.com/sindresorhus/file-type) that detects _audio_ and _video_ file formats.
This plugin helps differentiate between audio and video file types more precisely.

## Installation

Requires Node.js 22 or newer.

```bash
npm install @file-type/av
```
## Usage

Here’s how to use this plugin with `file-type` to detect audio/video formats:

```js
import { fileTypeFromFile } from 'file-type';
import { detectAv } from '@file-type/av';

const fileType = await fileTypeFromFile('example.mka', {
  customDetectors: [detectAv]
});

console.log(JSON.stringify(fileType, null, 2));
```

---

## Supported Media Formats

### Matroska
- `audio/matroska` – `.mka`
- `video/matroska` – `.mkv`

### MP4
- `audio/mp4` – `.m4a`
- `video/mp4` – `.mp4`

### Ogg
- `audio/ogg; codecs=opus` – `.opus` (Opus)
- `audio/ogg; codecs=speex` – `.spx` (Speex)
- `audio/ogg; codecs=vorbis` – `.ogg` (Vorbis)
- `video/ogg` – `.ogv` (Theora)

### WebM
- `audio/webm` – `.webm`
- `video/webm` – `.webm`

### ASF / Windows Media

The plugin inspects all tracks, giving video precedence over audio. Windows Media
codecs use `.wma` or `.wmv`; other codecs retain `.asf`.

- `audio/x-ms-asf` – `.wma`
- `video/x-ms-asf` – `.wmv`
- `audio/x-ms-asf` – `.asf` (other audio codecs)
- `video/x-ms-asf` – `.asf` (other video codecs)
- `application/vnd.ms-asf` – `.asf` (no audio or video tracks)

---

## License

Licensed under the [MIT License](LICENSE.txt).
You are free to use, modify, and distribute this project as needed.
