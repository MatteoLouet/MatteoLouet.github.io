/**
 * Fig. 1 — Study Planner : du formulaire au calendrier.
 * - Construit la requête et le prompt EXACTS du code (src/App.tsx → server/index.ts) à partir de la saisie.
 * - Anime le trajet navigateur → Express (:3001) → Groq → retour. Aucun appel réel n'est fait :
 *   la réponse du modèle n'est pas simulée, seule la structure demandée est montrée.
 * - Applique le VRAI algorithme addWeekToCalendar (portage ligne à ligne) à une semaine de tâches d'exemple.
 */
const T = {
  fr: {
    send: 'Envoyer la requête', sending: 'En route…',
    steps: ['Le navigateur envoie l’objectif à /api/generate-plan', 'Express construit le prompt et appelle Groq avec la clé API', 'Llama 3.3 70B répond en JSON (response_format)', 'Express renvoie { plan } au navigateur'],
    placed: 'tâches placées', dropped: 'ignorées (après 19 h)', days: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'],
    task: 'Tâche',
  },
  en: {
    send: 'Send the request', sending: 'On its way…',
    steps: ['The browser sends the goal to /api/generate-plan', 'Express builds the prompt and calls Groq with the API key', 'Llama 3.3 70B replies with JSON (response_format)', 'Express returns { plan } to the browser'],
    placed: 'tasks placed', dropped: 'dropped (after 7 pm)', days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    task: 'Task',
  },
};

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** Portage fidèle de addWeekToCalendar (src/App.tsx). */
export function addWeekToCalendar(tasks: { title: string; estimatedHours: number }[]) {
  const WORK_DAYS = 5;
  const tasksPerDay = Math.ceil(tasks.length / WORK_DAYS);
  const groups: (typeof tasks)[] = [];
  for (let i = 0; i < tasks.length; i += tasksPerDay) groups.push(tasks.slice(i, i + tasksPerDay));
  const events: { title: string; day: number; start: number; end: number }[] = [];
  const dropped: string[] = [];
  groups.forEach((dayTasks, dayIdx) => {
    if (dayIdx >= WORK_DAYS) { dayTasks.forEach((t) => dropped.push(t.title)); return; }
    let current = 9 * 60;
    dayTasks.forEach((task) => {
      const dur = Math.round((task.estimatedHours > 0 ? task.estimatedHours : 1) * 60);
      if (current + dur > 19 * 60) { dropped.push(task.title); return; }
      events.push({ title: task.title, day: dayIdx, start: current, end: current + dur });
      current = current + dur + 30;
    });
  });
  return { events, dropped, tasksPerDay };
}

export function mountPlanner(root: HTMLElement) {
  const lang = root.dataset.lang === 'en' ? 'en' : 'fr';
  const L = T[lang];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const q = <E extends HTMLElement>(s: string) => root.querySelector<E>(s)!;

  const title = q<HTMLInputElement>('[data-title]');
  const level = q<HTMLSelectElement>('[data-level]');
  const hours = q<HTMLInputElement>('[data-hours]');
  const hoursOut = q<HTMLElement>('[data-hours-out]');
  const body = q<HTMLElement>('[data-body]');
  const prompt = q<HTMLElement>('[data-prompt]');
  const send = q<HTMLButtonElement>('[data-send]');
  const stepEl = q<HTMLElement>('[data-step]');
  const lanes = [...root.querySelectorAll<HTMLElement>('[data-lane]')];
  const packet = q<HTMLElement>('[data-packet]');

  const build = () => {
    hoursOut.textContent = `${hours.value} h`;
    const goal = { title: title.value, level: level.value, hoursPerWeek: Number(hours.value), id: 'g1731000000000' };
    body.innerHTML = esc(JSON.stringify(goal, null, 2));
    const p = `Crée un plan d'étude pour : "${goal.title}" (Niveau: ${goal.level}, ${goal.hoursPerWeek}h/semaine).
Réponds UNIQUEMENT en JSON valide.
Structure : {"overview":{"approach":"..."},"weeks":[{"weekNumber":1,"theme":"...","tasks":[{"title":"...","estimatedHours":2}]}]}
Génère 4 semaines d'étude variées.`;
    prompt.innerHTML = esc(p).replace(esc(`"${goal.title}"`), `<mark>${esc(`"${goal.title}"`)}</mark>`).replace(`Niveau: ${goal.level}`, `Niveau: <mark>${goal.level}</mark>`).replace(`${goal.hoursPerWeek}h/semaine`, `<mark>${goal.hoursPerWeek}</mark>h/semaine`);
  };
  [title, level, hours].forEach((e) => e.addEventListener('input', build));
  build();

  // Trajet : positions en % de la largeur des 3 couloirs (0 = navigateur, 50 = Express, 100 = Groq)
  const path = [[0, 50, 0], [50, 100, 1], [100, 50, 2], [50, 0, 3]];
  let running = false;
  send.addEventListener('click', () => {
    if (running) return;
    running = true;
    send.textContent = L.sending;
    send.disabled = true;
    let i = 0;
    const hop = () => {
      if (i >= path.length) { running = false; send.disabled = false; send.textContent = L.send; lanes.forEach((l) => l.classList.remove('is-on')); return; }
      const [a, b, s] = path[i];
      stepEl.textContent = `${i + 1}/4 — ${L.steps[s]}`;
      lanes.forEach((l, k) => l.classList.toggle('is-on', k === (b === 0 ? 0 : b === 50 ? 1 : 2)));
      packet.style.transition = 'none';
      packet.style.left = `${a}%`;
      packet.getBoundingClientRect();
      packet.style.transition = reduce ? 'none' : 'left 900ms cubic-bezier(.2,.7,.1,1)';
      packet.style.left = `${b}%`;
      i += 1;
      window.setTimeout(hop, reduce ? 50 : 1300);
    };
    hop();
  });

  /* ---------- Calendrier : algorithme réel sur une semaine d'exemple ---------- */
  const nTasks = q<HTMLInputElement>('[data-ntasks]');
  const dur = q<HTMLInputElement>('[data-dur]');
  const nOut = q<HTMLElement>('[data-ntasks-out]');
  const dOut = q<HTMLElement>('[data-dur-out]');
  const cal = q<HTMLElement>('[data-cal]');
  const sum = q<HTMLElement>('[data-calsum]');
  const fmt = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  const drawCal = () => {
    const n = Number(nTasks.value), h = Number(dur.value);
    nOut.textContent = String(n);
    dOut.textContent = `${String(h).replace('.', lang === 'fr' ? ',' : '.')} h`;
    const tasks = Array.from({ length: n }, (_, k) => ({ title: `${L.task} ${k + 1}`, estimatedHours: h }));
    const { events, dropped } = addWeekToCalendar(tasks);
    const HOUR = 26;
    let html = `<div class="pl-hours">${Array.from({ length: 11 }, (_, k) => `<span style="top:${k * HOUR}px">${9 + k}h</span>`).join('')}</div>`;
    html += L.days.map((d, di) => `<div class="pl-day"><span class="pl-dname">${d}</span><div class="pl-col">${
      events.filter((e) => e.day === di).map((e) => `<div class="pl-ev pl-ev--${di}" style="top:${((e.start - 540) / 60) * HOUR}px;height:${((e.end - e.start) / 60) * HOUR - 2}px" title="${e.title} · ${fmt(e.start)}–${fmt(e.end)}"><b>${e.title}</b><span>${fmt(e.start)}–${fmt(e.end)}</span></div>`).join('')
    }</div></div>`).join('');
    cal.innerHTML = html;
    sum.innerHTML = `<b>${events.length}</b> ${L.placed}${dropped.length ? ` · <b class="accent">${dropped.length}</b> ${L.dropped}` : ''}`;
  };
  [nTasks, dur].forEach((e) => e.addEventListener('input', drawCal));
  drawCal();
}
