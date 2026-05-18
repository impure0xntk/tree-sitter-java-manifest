{
  description = "tree-sitter parser for Java MANIFEST.MF";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-25.11";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            tree-sitter
            nodejs
          ];

          shellHook = ''
            echo "tree-sitter dev shell"
            tree-sitter --version
          '';
        };
      });
}
