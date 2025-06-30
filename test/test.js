import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {fileTypeFromFile} from 'file-type';
import {describe, it} from 'mocha';
import {assert} from 'chai';

import {detectAv} from '../lib/index.js';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

function getSamplePath(filename) {
	return path.join(dirname, 'fixture', filename);
}

describe('AV Detector', () => {

	describe('Matroska', () => {

		it('audio (mka)', async () => {
			const type = await fileTypeFromFile( getSamplePath('fixture.mka'), {customDetectors: [detectAv]});
			assert.strictEqual(type.ext, 'mka')
			assert.strictEqual(type.mime, 'audio/matroska')
		});

		it('video (mkv)', async () => {
			const type = await fileTypeFromFile( getSamplePath('SampleVideo_360x240_1mb.mkv'), {customDetectors: [detectAv]});
			assert.strictEqual(type.ext, 'mkv')
			assert.strictEqual(type.mime, 'video/matroska')
		});

	});

	describe('MP4', () => {

		it('audio (m4a)', async () => {
			const type = await fileTypeFromFile( getSamplePath('Apple  voice memo.m4a'), {customDetectors: [detectAv]});
			assert.strictEqual(type.ext, 'm4a')
			assert.strictEqual(type.mime, 'audio/mp4')
		});

		it('video (mp4)', async () => {
			const type = await fileTypeFromFile( getSamplePath('SampleVideo_360x240_1mb.mp4'), {customDetectors: [detectAv]});
			assert.strictEqual(type.ext, 'mp4')
			assert.strictEqual(type.mime, 'video/mp4')
		});

	});

	describe('Windows Media File', () => {

		it('audio (wma)', async () => {
			const type = await fileTypeFromFile( getSamplePath('sample-3.wma'), {customDetectors: [detectAv]});
			// assert.strictEqual(type.ext, 'wma')
			assert.strictEqual(type.mime, 'audio/x-ms-asf')
		});

		it('video (wmv)', async () => {
			const type = await fileTypeFromFile( getSamplePath('sample-wmv-files-sample_960x540.wmv'), {customDetectors: [detectAv]});
			// assert.strictEqual(type.ext, 'wmv')
			assert.strictEqual(type.mime, 'video/x-ms-asf')
		});

	});

});
