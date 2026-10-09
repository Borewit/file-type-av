const assert = require("node:assert/strict");
const { test } = require("node:test");
const { classify } = require("./classify.cjs");
const label = require("./label.cjs");

function fixture() {
	const manifest = {
		name: "project",
		dependencies: { runtime: "^1" },
		devDependencies: { mocha: "^1", typescript: "^1" },
	};
	const lock = {
		lockfileVersion: 3,
		packages: { "": structuredClone(manifest) },
	};
	for (const name of [
		"runtime",
		"shared",
		"mocha",
		"typescript",
		"transitive",
	]) {
		lock.packages[`node_modules/${name}`] = {
			version: "1.0.0",
			...(name === "runtime" || name === "shared" ? {} : { dev: true }),
		};
	}
	const base = { manifest, lock };
	return {
		base,
		head: structuredClone(base),
		dependencyNames: ["transitive"],
		files: ["package-lock.json"],
	};
}

function bump(input, name) {
	input.head.lock.packages[`node_modules/${name}`].version = "1.0.1";
}

test("development-only direct and transitive updates use dev-dependencies", () => {
	for (const version of [2, 3]) {
		for (const name of ["mocha", "typescript", "transitive"]) {
			const input = fixture();
			input.base.lock.lockfileVersion = input.head.lock.lockfileVersion =
				version;
			input.dependencyNames = [name];
			bump(input, name);
			assert.equal(classify(input), "dev-dependencies");
		}
	}
});

test("runtime and shared packages stay visible", () => {
	for (const name of ["runtime", "shared"]) {
		const input = fixture();
		input.dependencyNames = [name];
		bump(input, name);
		assert.equal(classify(input), "dependencies");
	}
});

test("grouped updates must all be development-only", () => {
	const input = fixture();
	input.dependencyNames = ["mocha", "transitive"];
	bump(input, "mocha");
	bump(input, "transitive");
	assert.equal(classify(input), "dev-dependencies");
	input.dependencyNames.push("shared");
	assert.equal(classify(input), "dependencies");
});

test("collateral runtime changes and scope transitions stay visible", () => {
	for (const change of ["runtime", "scope", "removed"]) {
		const input = fixture();
		bump(input, "transitive");
		if (change === "runtime") bump(input, "shared");
		if (change === "scope")
			delete input.head.lock.packages["node_modules/transitive"].dev;
		if (change === "removed")
			delete input.head.lock.packages["node_modules/shared"];
		assert.equal(classify(input), "dependencies");
	}
});

test("runtime optional and peer dependencies override development flags", () => {
	for (const field of ["optionalDependencies", "peerDependencies"]) {
		const input = fixture();
		for (const snapshot of [input.base, input.head])
			snapshot.manifest[field] = { transitive: "^1" };
		assert.equal(classify(input), "dependencies");
	}
	const input = fixture();
	input.head.lock.packages["node_modules/transitive"].devOptional = true;
	assert.equal(classify(input), "dependencies");
});

test("runtime manifest changes stay visible without a lock resolution change", () => {
	const input = fixture();
	input.head.manifest.dependencies.runtime = ">=1";
	assert.equal(classify(input), "dependencies");
});

test("nested scoped packages and npm aliases retain their scope", () => {
	const input = fixture();
	for (const snapshot of [input.base, input.head]) {
		snapshot.lock.packages["node_modules/mocha/node_modules/@scope/alias"] = {
			name: "@scope/actual",
			version: "1.0.0",
			dev: true,
		};
	}
	for (const name of ["@scope/alias", "@scope/actual"]) {
		input.dependencyNames = [name];
		input.head.lock.packages[
			"node_modules/mocha/node_modules/@scope/alias"
		].version = "1.0.1";
		assert.equal(classify(input), "dev-dependencies");
	}
});

test("unknown updates and unrelated changes stay visible", () => {
	const input = fixture();
	for (const names of [[], ["unknown"]]) {
		input.dependencyNames = names;
		assert.equal(classify(input), "dependencies");
	}
	input.dependencyNames = ["transitive"];
	input.files.push("lib/index.ts");
	assert.equal(classify(input), "dependencies");
});

test("unsupported lockfiles and workspaces fail classification", () => {
	for (const kind of ["old", "workspace", "link"]) {
		const input = fixture();
		if (kind === "old") input.head.lock.lockfileVersion = 1;
		if (kind === "workspace") input.head.manifest.workspaces = ["packages/*"];
		if (kind === "link")
			input.head.lock.packages["node_modules/transitive"].link = true;
		assert.throws(() => classify(input), /Expected|Unsupported/);
	}
});

function mock(
	input,
	{ readError = false, stale = false, incomplete = false, removeStatus } = {},
) {
	const changes = [];
	const warnings = [];
	const github = {
		paginate: async () =>
			input.files.slice(incomplete ? 1 : 0).map((filename) => ({ filename })),
		rest: {
			pulls: {
				listFiles: {},
				get: async () => ({
					data: { head: { sha: stale ? "new-head" : "head" } },
				}),
			},
			repos: {
				compareCommits: async () => ({
					data: { merge_base_commit: { sha: "merge-base" } },
				}),
				getContent: async ({ ref, path }) => {
					if (readError) throw new Error("Unavailable lockfile");
					assert.ok(["merge-base", "head"].includes(ref));
					assert.ok(["package.json", "package-lock.json"].includes(path));
					const snapshot = ref === "merge-base" ? input.base : input.head;
					const data =
						path === "package.json" ? snapshot.manifest : snapshot.lock;
					return {
						data: {
							type: "file",
							encoding: "base64",
							content: Buffer.from(JSON.stringify(data)).toString("base64"),
						},
					};
				},
			},
			issues: {
				addLabels: async ({ labels }) => changes.push(["add", ...labels]),
				removeLabel: async ({ name }) => {
					if (removeStatus)
						throw Object.assign(new Error("Label error"), {
							status: removeStatus,
						});
					changes.push(["remove", name]);
				},
			},
		},
	};
	return {
		changes,
		warnings,
		args: {
			github,
			context: {
				repo: { owner: "owner", repo: "repo" },
				payload: {
					pull_request: {
						number: 1,
						changed_files: input.files.length,
						base: { sha: "base-tip" },
						head: { sha: "head" },
					},
				},
			},
			core: {
				info: () => undefined,
				warning(message) {
					warnings.push(message);
				},
			},
			dependencyNames: input.dependencyNames,
		},
	};
}

test("label synchronization works in both directions using the merge base", async () => {
	for (const name of ["transitive", "runtime"]) {
		const input = fixture();
		input.dependencyNames = [name];
		bump(input, name);
		const { args, changes } = mock(input);
		await label(args);
		const expected =
			name === "runtime"
				? ["dependencies", "dev-dependencies"]
				: ["dev-dependencies", "dependencies"];
		assert.deepEqual(changes, [
			["add", expected[0]],
			["remove", expected[1]],
		]);
	}
});

test("API errors and incomplete file lists preserve release-note visibility", async () => {
	for (const options of [{ readError: true }, { incomplete: true }]) {
		const { args, changes, warnings } = mock(fixture(), options);
		await label(args);
		assert.deepEqual(changes, [
			["add", "dependencies"],
			["remove", "dev-dependencies"],
		]);
		assert.equal(warnings.length, 1);
	}
});

test("stale runs do not change labels", async () => {
	const { args, changes } = mock(fixture(), { stale: true });
	await label(args);
	assert.deepEqual(changes, []);
});

test("missing opposite labels are ignored while permission errors fail", async () => {
	await label(mock(fixture(), { removeStatus: 404 }).args);
	await assert.rejects(
		label(mock(fixture(), { removeStatus: 403 }).args),
		/Label error/,
	);
});

test("repository lockfile distinguishes shared runtime packages from tooling", () => {
	const base = {
		manifest: require("../../../package.json"),
		lock: require("../../../package-lock.json"),
	};
	for (const [name, expected] of [
		["mocha", "dev-dependencies"],
		["music-metadata", "dependencies"],
		["file-type", "dependencies"],
	]) {
		const input = {
			base,
			head: structuredClone(base),
			dependencyNames: [name],
			files: ["package-lock.json"],
		};
		input.head.lock.packages[`node_modules/${name}`].version = "99.0.0";
		assert.equal(classify(input), expected);
	}
});
