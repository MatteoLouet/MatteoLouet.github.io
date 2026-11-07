/**
 * Découpe cmapss.json en un fichier par capteur au build :
 * le navigateur ne télécharge que le capteur affiché (~7× plus léger).
 */
import type { APIRoute, GetStaticPaths } from 'astro';
import data from '../../../data/cmapss.json';

type Series = Record<string, number[]>;

export const getStaticPaths: GetStaticPaths = () =>
  ['index', ...data.sensors.map((s) => s.id)].map((sensor) => ({ params: { sensor } }));

export const GET: APIRoute = ({ params }) => {
  if (params.sensor === 'index') {
    return new Response(
      JSON.stringify({ meta: data.meta, sensors: data.sensors, lives: data.units.map((u) => u.life) })
    );
  }
  const id = params.sensor as string;
  return new Response(JSON.stringify(data.units.map((u) => (u.series as Series)[id])));
};
