{
  description = "Vodalus";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs =
    { self, nixpkgs }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
    in
    {
      devShells = forAllSystems (
        system:
        let
          pkgs = import nixpkgs { inherit system; };
        in
        {
          default = pkgs.mkShell {
            packages = with pkgs; [
              nodejs
              typescript
            ];
            shellHook = ''
              if command -v fish >/dev/null 2>&1; then
                exec fish
              elif command -v zsh >/dev/null 2>&1; then
                exec zsh
              fi
            '';
          };
        }
      );
    };
}
