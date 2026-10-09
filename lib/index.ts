import { parseFromTokenizer, TrackType } from "music-metadata";
import type { Detector } from "file-type";
import type { ITokenizer } from "strtok3"; // ToDo: export from file-type

const parserOptions = {
	duration: false,
	includeChapters: false,
	skipCovers: true,
	skipPostHeaders: true,
};

function matchesHeader(data: Uint8Array, header: Uint8Array | number[]) {
	if (data.length < header.length) return false;
	for (let i = 0; i < header.length; i++) {
		if (data[i] !== header[i]) return false;
	}
	return true;
}

function stringMatchesHeader(data: Uint8Array, header: string) {
	const expected = new TextEncoder().encode(header);
	return matchesHeader(data, expected);
}

export const detectAv: Detector = {
	id: "av",
	detect: async (tokenizer: ITokenizer) => {
		const buffer = new Uint8Array(16);
		await tokenizer.peekBuffer(buffer, { mayBeLess: true });

		if (
			matchesHeader(
				buffer,
				[
					0x30, 0x26, 0xb2, 0x75, 0x8e, 0x66, 0xcf, 0x11, 0xa6, 0xd9, 0x00,
					0xaa, 0x00, 0x62, 0xce, 0x6c,
				],
			)
		) {
			const { format } = await parseFromTokenizer(tokenizer, parserOptions);
			if (format.hasVideo) {
				const hasWindowsMediaVideo = format.trackInfo?.some(
					(track) =>
						track.type === TrackType.video &&
						["WMV1", "WMV2", "WMV3", "WVC1"].includes(track.codecId ?? ""),
				);
				return {
					ext: hasWindowsMediaVideo ? "wmv" : "asf",
					mime: "video/x-ms-asf",
				};
			}

			if (format.hasAudio) {
				const hasWindowsMediaAudio = format.trackInfo?.some(
					(track) =>
						track.type === TrackType.audio &&
						["0x0160", "0x0161", "0x0162", "0x0163"].includes(
							track.codecId ?? "",
						),
				);
				return {
					ext: hasWindowsMediaAudio ? "wma" : "asf",
					mime: "audio/x-ms-asf",
				};
			}

			return { ext: "asf", mime: "application/vnd.ms-asf" };
		}

		if (matchesHeader(buffer, [0x1a, 0x45, 0xdf, 0xa3])) {
			const { format } = await parseFromTokenizer(tokenizer, parserOptions);
			switch (format.container) {
				case "EBML/matroska":
					return format.hasVideo
						? {
								ext: "mkv",
								mime: "video/matroska",
							}
						: {
								ext: "mka",
								mime: "audio/matroska",
							};
				case "EBML/webm":
					return format.hasVideo
						? {
								ext: "webm",
								mime: "video/webm",
							}
						: {
								ext: "webm",
								mime: "audio/webm",
							};
			}
		}

		if (stringMatchesHeader(buffer.subarray(4), "ftyp")) {
			const { format } = await parseFromTokenizer(tokenizer, parserOptions);
			return format.hasVideo
				? {
						ext: "mp4",
						mime: "video/mp4",
					}
				: {
						ext: "m4a",
						mime: "audio/mp4",
					};
		}

		if (stringMatchesHeader(buffer, "OggS")) {
			const { format } = await parseFromTokenizer(tokenizer, parserOptions);

			if (format.hasVideo) {
				return {
					ext: "ogv",
					mime: "video/ogg",
				};
			}

			if (format.codec) {
				if (format.codec.startsWith("Opus")) {
					return {
						ext: "opus",
						mime: "audio/ogg; codecs=opus",
					};
				}

				if (format.codec.startsWith("Vorbis")) {
					return {
						ext: "ogg",
						mime: "audio/ogg; codecs=vorbis",
					};
				}

				if (format.codec.startsWith("Speex")) {
					return {
						ext: "spx",
						mime: "audio/ogg; codecs=speex",
					};
				}

				if (format.codec.startsWith("FLAC")) {
					return {
						ext: "flac",
						mime: "audio/ogg; codecs=flac",
					};
				}
			}

			return {
				ext: "ogg",
				mime: "audio/ogg",
			};
		}
	},
};
