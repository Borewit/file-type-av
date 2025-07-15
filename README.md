[![NPM version](https://img.shields.io/npm/v/@file-type/av.svg)](https://npmjs.org/package/@file-type/av)
[![Node.js CI](https://github.com/Borewit/file-type-av/actions/workflows/nodejs-ci.yml/badge.svg)](https://github.com/Borewit/file-type-av/actions/workflows/nodejs-ci.yml)
[![npm downloads](http://img.shields.io/npm/dm/@file-type/av.svg)](https://npmcharts.com/compare/@file-type/av?start=365)

# @file-type/av

Detector plugin for [file-type](https://github.com/sindresorhus/file-type) for _audio_ and _video_ files.
This detector helps to distinct the difference between audio and video files.

## Installation

```bash
npm install @file-type/av
```

## Usage

The following example shows how add the XML detector to [file-type](https://github.com/sindresorhus/file-type).
```js
import {fileTypeFromFile} from 'file-type';
import {detectAv} from 'file-type/av';

const fileType = await fileTypeFromFile('example.mka', {customDetectors: [detectAv]});
console.log(JSON.stringify(fileType));
```

## Support media formats

- Matroska
	- `audio/matroska`, `mka`
	- `video/matroska`, `mkv`
- MP4:
	- `audio/mp4`, `m4a`
	- `video/mp4`, `mp4`
- Ogg:
	- `audio/ogg; codecs=opus`, `opus` (Opus)
	- `audio/ogg; codecs=speex, `spx` (Speex)
	- `audio/ogg; codecs=vorbis`, `ogg` (Vorbis
	- `video/ogg`, `ogv` (Theora)
- WebM:
	- `video/webm`, `webm`
	- `audio/webm`, `webm`
- Windows Media File:
	- `audio/x-ms-asf`, `wma`
	- `video/x-ms-asf`, `wmv`

## Licence

This project is licensed under the [MIT License](LICENSE.txt). Feel free to use, modify, and distribute as needed.
