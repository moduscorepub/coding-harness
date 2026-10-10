import { describe, expect, it } from "bun:test";
import { isFullyQualifiedPath, stripWindowsExtendedLengthPathPrefix, windowsPathToWslMount } from "../src/path";

describe("stripWindowsExtendedLengthPathPrefix", () => {
	it("removes drive and UNC extended-length prefixes on Windows", () => {
		expect(stripWindowsExtendedLengthPathPrefix("\\\\?\\C:\\Users\\Shi Xin\\harness.exe", "win32")).toBe(
			"C:\\Users\\Shi Xin\\harness.exe",
		);
		expect(stripWindowsExtendedLengthPathPrefix("\\\\?\\UNC\\server\\share\\harness.exe", "win32")).toBe(
			"\\\\server\\share\\harness.exe",
		);
	});

	it("leaves non-Windows paths unchanged", () => {
		const path = "\\\\?\\C:\\Users\\Shi Xin\\harness.exe";
		expect(stripWindowsExtendedLengthPathPrefix(path, "linux")).toBe(path);
	});
});

describe("windowsPathToWslMount", () => {
	it("clamps parent traversal at the Windows drive root", () => {
		expect(windowsPathToWslMount("C:\\..\\Windows\\x")).toBe("/mnt/c/Windows/x");
	});

	it("rejects paths without an absolute Windows drive", () => {
		expect(windowsPathToWslMount("/home/me/file.txt")).toBeUndefined();
	});
});

describe("isFullyQualifiedPath", () => {
	it("identifies fully qualified Windows paths across platforms", () => {
		expect(isFullyQualifiedPath("C:\\harness\\bin\\harness.exe", "win32")).toBe(true);
		expect(isFullyQualifiedPath("c:/harness/bin/harness.exe", "win32")).toBe(true);
		expect(isFullyQualifiedPath("\\\\server\\share\\harness.exe", "win32")).toBe(true);
		expect(isFullyQualifiedPath("//server/share/harness.exe", "win32")).toBe(true);
		expect(isFullyQualifiedPath("C:harness", "win32")).toBe(false);
		expect(isFullyQualifiedPath(".\\harness", "win32")).toBe(false);
		expect(isFullyQualifiedPath("\\bin\\harness", "win32")).toBe(false);
		expect(isFullyQualifiedPath("/bin/harness", "win32")).toBe(false);
		expect(isFullyQualifiedPath("//", "win32")).toBe(false);
		expect(isFullyQualifiedPath("\\\\", "win32")).toBe(false);
	});

	it("identifies absolute POSIX paths", () => {
		expect(isFullyQualifiedPath("/usr/local/bin/harness", "darwin")).toBe(true);
		expect(isFullyQualifiedPath("/usr/local/bin/harness", "linux")).toBe(true);
		expect(isFullyQualifiedPath("./harness", "darwin")).toBe(false);
		expect(isFullyQualifiedPath("harness", "linux")).toBe(false);
	});
});
