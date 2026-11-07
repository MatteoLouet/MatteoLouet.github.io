# Harnais RoverRun

Rejoue l'algorithme de guidage du dépôt RoverRun (sources non modifiées) et écrit chaque phase en JSON.
`demo.map` est une carte de démonstration : la carte du cours (`maps/example1.map`) n'est pas dans le dépôt.

```bash
git clone https://github.com/MatteoLouet/RoverRun && cd RoverRun
cp ../scripts/roverrun/harness.c ../scripts/roverrun/demo.map . && cp -R ../scripts/roverrun/shim .
cc -O0 -w -Ishim -o harness harness.c loc.c map.c moves.c queue.c stack.c tree.c
./harness demo.map 11 0 1 run.json   # carte, x, y de départ, graine, sortie
```

`shim/malloc.h` remplace l'en-tête Windows/Linux absent de macOS.
