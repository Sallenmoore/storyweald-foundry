/**
 * Pure roll-formula builders: (profile + document data) -> {formula, label, flavor}.
 *
 * NO Foundry imports — everything here is plain data in, strings out, so the node
 * tests can exercise it directly. The sheets (T2) feed the returned formula to
 * `new Roll(...)`; a `null` return means "not rollable", and the sheet renders no
 * button for it.
 *
 * Defensiveness matters: ability `hit_roll`/`damage`/`save_dc` are LLM-generated
 * TEXT, not trusted formulas. "+6" and "2d6 + 4" are rollable; "see text" and
 * "WIS Save" are not. `sanitizeBonus`/`sanitizeDice` are the trust boundary — they
 * pass real dice/bonus expressions and null everything else.
 */

/** Append a signed integer bonus to a base formula ("2d6" + 2 -> "2d6 + 2"). */
function withBonus(base, n) {
  if (!n) return base; // 0 (or NaN-guarded upstream) adds nothing
  return n > 0 ? `${base} + ${n}` : `${base} - ${-n}`;
}

/**
 * A whole-string integer bonus ("+6", "6", "-1", 6) -> number, else null.
 * Rejects anything with dice or prose, so a `hit_roll` of "see text" nulls out.
 */
export function sanitizeBonus(raw) {
  if (typeof raw !== "string" && typeof raw !== "number") return null;
  const m = String(raw).trim().match(/^([+-]?\d+)$/);
  return m ? parseInt(m[1], 10) : null;
}

/**
 * Salvage the maximal LEADING dice expression -> normalized formula, else null.
 * Generated damage strings tack prose onto a real roll: "1d6 force",
 * "2d6 + 4 shock damage", "1d10 + Tech/Engineering Skill Level". We take the
 * leading run of dice/number terms and drop everything from the first
 * non-numeric term on. Pure prose ("Intelligence (Tech) check...", "see text")
 * has no leading die and nulls out, as does a flat number ("5").
 */
export function sanitizeDice(raw) {
  if (typeof raw !== "string") return null;
  let s = raw.trim().toLowerCase().replace(/^\+\s*/, "").replace(/\s+/g, " ");
  if (!s) return null;
  const term = "(?:\\d*d\\d+|\\d+)";
  const m = s.match(new RegExp(`^${term}(?:\\s*[+-]\\s*${term})*`));
  if (!m || !/d\d/.test(m[0])) return null; // must contain a die, not just numbers
  return m[0].replace(/\s*([+-])\s*/g, " $1 ");
}

/** Skill check: 2d6 + skill rank (SWN convention). null if the actor lacks it. */
export function skillRoll(profile, actor, skillName) {
  const skill = actor?.system?.skills?.find((s) => s.name === skillName);
  if (!skill) return null;
  return {
    formula: withBonus(profile.dice.skill, skill.level),
    label: skillName,
    flavor: "Skill Check",
  };
}

/**
 * Attack: profile attack die + the ability's hit bonus. When hit_roll is empty
 * (the common case — StoryTeller rarely fills it), fall back to the ACTOR's own
 * attack_bonus IF the ability deals salvageable damage — a damaging ability is
 * still an attack. Neither a hit bonus nor damage -> null (no button).
 */
export function attackRoll(profile, ability, actor) {
  const bonus = sanitizeBonus(ability?.system?.hit_roll);
  if (bonus !== null) {
    return { formula: withBonus(profile.dice.attack, bonus), label: "Attack", flavor: null };
  }
  if (actor && sanitizeDice(ability?.system?.damage) !== null) {
    return { formula: withBonus(profile.dice.attack, actor.system?.attack_bonus ?? 0), label: "Attack", flavor: null };
  }
  return null;
}

/** Damage: the ability's damage dice, sanitized. null if it isn't a dice string. */
export function damageRoll(profile, ability) {
  const formula = sanitizeDice(ability?.system?.damage);
  if (formula === null) return null;
  return { formula, label: "Damage", flavor: null };
}

/** Saving throw: roll the save die (roll high) vs the actor's save target. */
export function saveRoll(profile, actor, saveKey) {
  const label = profile.saves?.[saveKey];
  if (!label) return null;
  const target = actor?.system?.saves?.[saveKey];
  return {
    formula: profile.dice.save,
    label: `${label} Save`,
    flavor: target == null ? null : `vs ${target}`,
  };
}

/** Initiative formula straight from the profile (already an @-ref formula). */
export function initiativeFormula(profile) {
  return profile.initiative.formula;
}
