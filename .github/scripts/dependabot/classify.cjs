// npm's dev flag marks packages used exclusively by the development tree.
function graph(manifest, lock) {
	if (
		![2, 3].includes(lock?.lockfileVersion) ||
		!lock.packages?.[""] ||
		manifest.workspaces
	) {
		throw new Error("Expected a single-project npm v2 or v3 lockfile");
	}
	const entries = new Map();
	const runtime = new Set([
		...Object.keys(manifest.dependencies || {}),
		...Object.keys(manifest.optionalDependencies || {}),
		...Object.keys(manifest.peerDependencies || {}),
	]);
	const development = new Set();
	for (const [path, entry] of Object.entries(lock.packages)) {
		if (path === "") continue;
		const name = path.slice(
			path.lastIndexOf("node_modules/") + "node_modules/".length,
		);
		if (
			!path.startsWith("node_modules/") ||
			!/^(?:@[^/]+\/)?[^/]+$/.test(name) ||
			entry.link ||
			!entry.version
		) {
			throw new Error(`Unsupported lockfile entry: ${path}`);
		}
		entries.set(path, entry);
		const scope =
			entry.dev === true && entry.devOptional !== true ? development : runtime;
		scope.add(name);
		if (entry.name) scope.add(entry.name); // Include npm aliases' actual package names.
	}
	return { entries, runtime, development };
}

function classify({ base, head, dependencyNames, files }) {
	if (
		!dependencyNames.length ||
		files.some((file) => !["package.json", "package-lock.json"].includes(file))
	) {
		return "dependencies";
	}
	const before = graph(base.manifest, base.lock);
	const after = graph(head.manifest, head.lock);
	for (const field of [
		"dependencies",
		"optionalDependencies",
		"peerDependencies",
		"peerDependenciesMeta",
	]) {
		if (
			JSON.stringify(base.manifest[field]) !==
			JSON.stringify(head.manifest[field])
		) {
			return "dependencies";
		}
	}
	for (const name of dependencyNames) {
		if (
			before.runtime.has(name) ||
			after.runtime.has(name) ||
			!(before.development.has(name) || after.development.has(name))
		) {
			return "dependencies";
		}
	}
	// Check collateral changes as well as Dependabot's named updates.
	for (const path of new Set([
		...before.entries.keys(),
		...after.entries.keys(),
	])) {
		const previous = before.entries.get(path);
		const next = after.entries.get(path);
		if (JSON.stringify(previous) === JSON.stringify(next)) continue;
		if (
			[previous, next].some(
				(entry) => entry && (entry.dev !== true || entry.devOptional === true),
			)
		) {
			return "dependencies";
		}
	}
	return "dev-dependencies";
}

module.exports = { classify };
