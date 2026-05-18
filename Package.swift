// swift-tools-version:5.3

import Foundation
import PackageDescription

var sources = ["src/parser.c"]
if FileManager.default.fileExists(atPath: "src/scanner.c") {
    sources.append("src/scanner.c")
}

let package = Package(
    name: "TreeSitterManifest",
    products: [
        .library(name: "TreeSitterManifest", targets: ["TreeSitterManifest"]),
    ],
    dependencies: [
        .package(name: "SwiftTreeSitter", url: "https://github.com/tree-sitter/swift-tree-sitter", from: "0.9.0"),
    ],
    targets: [
        .target(
            name: "TreeSitterManifest",
            dependencies: [],
            path: ".",
            sources: sources,
            resources: [
                .copy("queries")
            ],
            publicHeadersPath: "bindings/swift",
            cSettings: [.headerSearchPath("src")]
        ),
        .testTarget(
            name: "TreeSitterManifestTests",
            dependencies: [
                "SwiftTreeSitter",
                "TreeSitterManifest",
            ],
            path: "bindings/swift/TreeSitterManifestTests"
        )
    ],
    cLanguageStandard: .c11
)
