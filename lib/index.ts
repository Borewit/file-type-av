import {parseFromTokenizer} from 'music-metadata';
import type {Detector} from 'file-type';
import type {ITokenizer} from 'strtok3'; // ToDo: export from file-type

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
	id: 'xml',
	detect: async (tokenizer: ITokenizer) => {

		const buffer = new Uint8Array(10);
		await tokenizer.peekBuffer(buffer);

		if (matchesHeader( buffer, [0x1A, 0x45, 0xDF, 0xA3])) {
			const {format} = await parseFromTokenizer(tokenizer);
			switch(format.container) {
				case 'EBML/matroska':
					return format.hasVideo ? {
						ext: 'mkv',
						mime: 'video/matroska'
					} : {
						ext: 'mka',
						mime: 'audio/matroska'
					};
			}
		}

		if (stringMatchesHeader(buffer.subarray(4), 'ftyp')) {
			const {format} = await parseFromTokenizer(tokenizer);
			return format.hasVideo ? {
				ext: 'mp4',
				mime: 'video/mp4'
			} : {
				ext: 'm4a',
				mime: 'audio/mp4'
			};
		} // Root element: EBML

	}
};
