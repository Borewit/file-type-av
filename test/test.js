import path from "node:path";
import { readFile } from "node:fs/promises";
import { fromBuffer } from "strtok3";
import { fileURLToPath } from "node:url";
import {
	fileTypeFromFile,
	fileTypeFromBuffer,
	fileTypeFromStream,
} from "file-type";
import { describe, it } from "mocha";
import { assert } from "chai";

import { detectAv } from "../lib/index.js";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

function getSamplePath(filename) {
	return path.join(dirname, "fixture", filename);
}

describe("AV Detector", () => {
	describe("Matroska", () => {
		it("audio (mka)", async () => {
			const type = await fileTypeFromFile(getSamplePath("audio.mka"), {
				customDetectors: [detectAv],
			});
			assert.strictEqual(type.ext, "mka");
			assert.strictEqual(type.mime, "audio/matroska");
		});

		it("video (mkv)", async () => {
			const type = await fileTypeFromFile(
				getSamplePath("SampleVideo_360x240_1mb.mkv"),
				{ customDetectors: [detectAv] },
			);
			assert.strictEqual(type.ext, "mkv");
			assert.strictEqual(type.mime, "video/matroska");
		});
	});

	describe("WebM", () => {
		it("WebM audio only", async () => {
			const type = await fileTypeFromFile(getSamplePath("audio.webm"), {
				customDetectors: [detectAv],
			});
			assert.strictEqual(type.ext, "webm");
			assert.strictEqual(type.mime, "audio/webm");
		});

		it("WebM audio and video", async () => {
			const type = await fileTypeFromFile(
				getSamplePath("audio_and_video.webm"),
				{ customDetectors: [detectAv] },
			);
			assert.strictEqual(type.ext, "webm");
			assert.strictEqual(type.mime, "video/webm");
		});

		it("WebM video only", async () => {
			const type = await fileTypeFromFile(
				getSamplePath("sample-webm-files-sample_960x540.webm"),
				{ customDetectors: [detectAv] },
			);
			assert.strictEqual(type.ext, "webm");
			assert.strictEqual(type.mime, "video/webm");
		});
	});

	describe("MP4", () => {
		it("audio (m4a)", async () => {
			const type = await fileTypeFromFile(
				getSamplePath("Apple  voice memo.m4a"),
				{ customDetectors: [detectAv] },
			);
			assert.strictEqual(type.ext, "m4a");
			assert.strictEqual(type.mime, "audio/mp4");
		});

		it("video (mp4)", async () => {
			const type = await fileTypeFromFile(
				getSamplePath("SampleVideo_360x240_1mb.mp4"),
				{ customDetectors: [detectAv] },
			);
			assert.strictEqual(type.ext, "mp4");
			assert.strictEqual(type.mime, "video/mp4");
		});
	});

	describe("Windows Media File", () => {
		it("audio (wma)", async () => {
			const type = await fileTypeFromFile(getSamplePath("sample-3.wma"), {
				customDetectors: [detectAv],
			});
			assert.strictEqual(type.ext, "wma");
			assert.strictEqual(type.mime, "audio/x-ms-asf");
		});

		it("video with a non-Windows Media codec (asf)", async () => {
			const type = await fileTypeFromFile(
				getSamplePath("sample-wmv-files-sample_960x540.wmv"),
				{ customDetectors: [detectAv] },
			);
			assert.strictEqual(type.ext, "asf");
			assert.strictEqual(type.mime, "video/x-ms-asf");
		});
	});

	describe("ASF track classification", () => {
		it("rejects incomplete or mismatched ASF header GUIDs", async () => {
			const data = await readFile(getSamplePath("video.wmv"));
			for (const length of [0, 10, 15]) {
				assert.isUndefined(
					await detectAv.detect(fromBuffer(data.subarray(0, length))),
				);
			}
			const invalid = new Uint8Array(data);
			invalid[15] ^= 1;
			assert.isUndefined(await detectAv.detect(fromBuffer(invalid)));
		});

		it("detects audio-first ASF from buffers and streams", async () => {
			const data = await readFile(getSamplePath("audio-first.wmv"));
			const options = { customDetectors: [detectAv] };
			const expected = { ext: "wmv", mime: "video/x-ms-asf" };
			assert.deepEqual(await fileTypeFromBuffer(data, options), expected);
			assert.deepEqual(
				await fileTypeFromStream(new Blob([data]).stream(), options),
				expected,
			);
		});

		for (const [filename, ext, mime] of [
			["video.wmv", "wmv", "video/x-ms-asf"],
			["audio-first.wmv", "wmv", "video/x-ms-asf"],
			["audio.asf", "asf", "audio/x-ms-asf"],
		]) {
			it(filename, async () => {
				const type = await fileTypeFromFile(getSamplePath(filename), {
					customDetectors: [detectAv],
				});
				assert.deepEqual(type, { ext, mime });
			});
		}
	});

	describe("Ogg", () => {
		it("audio (ogg/Vorbis)", async () => {
			const type = await fileTypeFromFile(getSamplePath("audio.vorbis.ogg"), {
				customDetectors: [detectAv],
			});
			assert.strictEqual(type.ext, "ogg");
			assert.strictEqual(type.mime, "audio/ogg; codecs=vorbis");
		});

		it("audio (ogg/Speex)", async () => {
			const type = await fileTypeFromFile(getSamplePath("audio.speex.ogg"), {
				customDetectors: [detectAv],
			});
			assert.strictEqual(type.ext, "spx");
			assert.strictEqual(type.mime, "audio/ogg; codecs=speex");
		});

		it("audio (ogg/Opus)", async () => {
			const type = await fileTypeFromFile(getSamplePath("audio.opus.ogg"), {
				customDetectors: [detectAv],
			});
			assert.strictEqual(type.ext, "opus");
			assert.strictEqual(type.mime, "audio/ogg; codecs=opus");
		});

		it("audio (ogg/FLAC)", async () => {
			const type = await fileTypeFromFile(getSamplePath("audio.flac.ogg"), {
				customDetectors: [detectAv],
			});
			assert.strictEqual(type.ext, "flac");
			assert.strictEqual(type.mime, "audio/ogg; codecs=flac");
		});

		it("video (ogv)", async () => {
			const type = await fileTypeFromFile(getSamplePath("echo-hereweare.ogv"), {
				customDetectors: [detectAv],
			});
			assert.strictEqual(type.ext, "ogv");
			assert.strictEqual(type.mime, "video/ogg");
		});
	});
});
