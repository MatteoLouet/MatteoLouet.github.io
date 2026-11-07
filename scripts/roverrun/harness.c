/* Harnais de démonstration : exécute l'algorithme de guidage de RoverRun (sources du dépôt,
 * non modifiées) sur une carte de démo et écrit chaque phase en JSON. */
#include <stdio.h>
#include <stdlib.h>
#include <time.h>
#include "tree.h"

static void dump_queue(FILE *o, t_queue_int q) {
  fprintf(o, "[");
  for (int k = q.first; k < q.last; k++) fprintf(o, "%s%d", k > q.first ? "," : "", q.values[k]);
  fprintf(o, "]");
}

int main(int argc, char **argv) {
  const char *mapfile = argv[1];
  int x0 = atoi(argv[2]), y0 = atoi(argv[3]);
  unsigned seed = (unsigned)atoi(argv[4]);
  FILE *o = fopen(argv[5], "w");
  FILE *devnull = freopen("/dev/null", "w", stdout); (void)devnull;

  t_map map = createMapFromFile((char *)mapfile);
  fprintf(o, "{\"seed\":%u,\"w\":%d,\"h\":%d,\"soils\":[", seed, map.x_max, map.y_max);
  for (int i = 0; i < map.y_max; i++) { fprintf(o, "%s[", i ? "," : ""); for (int j = 0; j < map.x_max; j++) fprintf(o, "%s%d", j ? "," : "", map.soils[i][j]); fprintf(o, "]"); }
  fprintf(o, "],\"costs\":[");
  for (int i = 0; i < map.y_max; i++) { fprintf(o, "%s[", i ? "," : ""); for (int j = 0; j < map.x_max; j++) fprintf(o, "%s%d", j ? "," : "", map.costs[i][j]); fprintf(o, "]"); }
  fprintf(o, "],\"start\":{\"x\":%d,\"y\":%d,\"ori\":0},\"phases\":[", x0, y0);

  t_localisation loc = loc_init(x0, y0, NORTH);
  int parmi = 5, nb_mouv = 3, arrive = 0, phase = 0;
  srand(seed);
  while (!arrive && phase < 40) {
    ARBRE *t = createtree();
    clock_t a = clock();
    remplir_tree(t, parmi, nb_mouv, loc, map);
    double ms = 1000.0 * (clock() - a) / CLOCKS_PER_SEC;
    NOEUD *min = trouver_min(t);
    fprintf(o, "%s{\"from\":{\"x\":%d,\"y\":%d,\"ori\":%d,\"soil\":%d},\"draws\":[", phase ? "," : "", loc.pos.x, loc.pos.y, loc.ori, map.soils[loc.pos.y][loc.pos.x]);
    for (int k = 0; k < parmi; k++) fprintf(o, "%s%d", k ? "," : "", t->racine->mouv[k]);
    fprintf(o, "],\"ms\":%.4f,\"leaves\":[", ms);
    for (int k = 0; k < t->feuille.nbElts; k++) {
      NOEUD *f = t->feuille.values[k];
      fprintf(o, "%s{\"v\":%d,\"x\":%d,\"y\":%d,\"path\":", k ? "," : "", f->val, f->loc.pos.x, f->loc.pos.y);
      dump_queue(o, f->chemin); fprintf(o, "}");
    }
    fprintf(o, "],\"best\":{\"v\":%d,\"x\":%d,\"y\":%d,\"path\":", min->val, min->loc.pos.x, min->loc.pos.y);
    dump_queue(o, min->chemin);
    deplacement(&loc, min->chemin.last, min->chemin);
    fprintf(o, "},\"to\":{\"x\":%d,\"y\":%d,\"ori\":%d}}", loc.pos.x, loc.pos.y, loc.ori);
    if (min->val == 0) arrive = 1;
    phase++;
  }
  fprintf(o, "],\"arrived\":%s}\n", arrive ? "true" : "false");
  fclose(o);
  return 0;
}
