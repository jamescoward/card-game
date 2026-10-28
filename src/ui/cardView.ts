import { card, KEYWORD_INFO } from '../data/cards';
import { FACTION_COLORS } from '../data/decks';
import { TerrainDef } from '../data/terrains';
import { Keyword, UnitView } from '../model/types';

function kwIcons(kws: Keyword[]): string {
  return kws.map(k => `<span title="${k}">${KEYWORD_INFO[k].icon}</span>`).join('');
}

function kwLine(kws: Keyword[]): string {
  return kws.length ? `<div class="kw-line">${kws.map(k => `<b>${KEYWORD_INFO[k].icon} ${k}</b>`).join(' ')}</div>` : '';
}

function factionStyle(id: string): string {
  return `--fc:${FACTION_COLORS[card(id).faction]}`;
}

export function handCardHtml(id: string, index: number, opts: { playable: boolean; selected: boolean; total: number }): string {
  const c = card(id);
  const spell = c.type === 'spell';
  return `
    <button class="hand-card ${opts.playable ? 'playable' : ''} ${opts.selected ? 'selected' : ''} ${spell ? 'spell' : ''} ${c.inkable ? '' : 'uninkable'}"
      data-hand="${index}" style="${factionStyle(id)};--i:${index};--n:${opts.total}">
      <span class="cost"><b>${c.cost}</b></span>
      ${c.inkable ? '' : '<span class="no-ink" title="Uninkable">🚫</span>'}
      <span class="hc-art">${c.art}</span>
      <span class="hc-name">${c.name}</span>
      ${spell
        ? '<span class="hc-spell">SPELL</span>'
        : `<span class="hc-stats"><i class="atk">${c.power}</i><i class="kwi">${kwIcons(c.keywords)}</i><i class="hp">${c.life}</i></span>`}
    </button>`;
}

export function unitHtml(v: UnitView, opts: { targetable?: boolean; doomed?: boolean; fresh?: boolean } = {}): string {
  const c = card(v.cardId);
  const cls = [
    'unit',
    v.exhausted ? 'exhausted' : '',
    v.frozen ? 'frozen' : '',
    v.shield ? 'shielded' : '',
    opts.targetable ? 'targetable' : '',
    opts.doomed ? 'doomed' : '',
    opts.fresh ? 'fresh' : '',
  ].join(' ');
  const pBuff = v.power > c.power ? 'up' : v.power < c.power ? 'down' : '';
  const hurt = v.life < v.maxLife ? 'hurt' : v.maxLife > c.life ? 'up' : '';
  return `
    <div class="${cls}" data-uid="${v.uid}" data-owner="${v.owner}" data-lane="${v.lane}" style="${factionStyle(v.cardId)}">
      <div class="unit-kws">${kwIcons(v.keywords)}</div>
      <div class="unit-art">${c.art}</div>
      <div class="unit-name">${c.name}</div>
      <div class="stat atk ${pBuff}">${v.power}</div>
      <div class="stat hp ${hurt}">${v.life}</div>
      ${v.frozen ? '<div class="unit-status">❄️</div>' : v.exhausted ? '<div class="unit-status">💤</div>' : ''}
      ${opts.doomed ? '<div class="doom">💀</div>' : ''}
    </div>`;
}

export function bigCardHtml(id: string, live?: UnitView): string {
  const c = card(id);
  const kws = live ? live.keywords : c.keywords;
  const power = live ? live.power : c.power;
  const life = live ? live.life : c.life;
  return `
    <div class="big-card ${c.type}" style="${factionStyle(id)}">
      <div class="bc-top">
        <span class="cost"><b>${c.cost}</b></span>
        <span class="bc-name">${c.name}</span>
        <span class="bc-faction">${c.faction}${c.inkable ? '' : ' · 🚫 uninkable'}</span>
      </div>
      <div class="bc-art">${c.art}</div>
      <div class="bc-text">
        ${kwLine(kws)}
        ${c.text ? `<p>${c.text}</p>` : kws.length ? '' : '<p class="muted">No abilities — just stats.</p>'}
        ${kws.map(k => `<p class="kw-explain">${KEYWORD_INFO[k].text}</p>`).join('')}
      </div>
      ${c.type === 'creature'
        ? `<div class="bc-stats"><span class="atk">⚔ ${power}</span><span class="hp">❤ ${life}${live && live.life < live.maxLife ? `<small>/${live.maxLife}</small>` : ''}</span></div>`
        : '<div class="bc-stats"><span class="spell-tag">✨ Spell</span></div>'}
    </div>`;
}

export function terrainHtml(t: TerrainDef): string {
  return `
    <div class="big-card terrain-card">
      <div class="bc-top"><span class="bc-name">${t.name}</span><span class="bc-faction">Terrain</span></div>
      <div class="bc-art">${t.art}</div>
      <div class="bc-text"><p>${t.text}</p></div>
    </div>`;
}

export function miniCardHtml(id: string, extra = ''): string {
  const c = card(id);
  return `
    <div class="mini-card" style="${factionStyle(id)}" ${extra}>
      <span class="cost"><b>${c.cost}</b></span>
      <span class="mc-art">${c.art}</span>
      <span class="mc-name">${c.name}</span>
      <span class="mc-stats">${c.type === 'spell' ? '✨' : `${c.power}/${c.life}`}</span>
    </div>`;
}
