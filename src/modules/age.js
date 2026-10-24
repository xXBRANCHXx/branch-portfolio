// Branch's birthday. His age on the page is worked out from it when the page loads,
// so it never needs updating by hand. The number written in index.html is only the
// fallback for anyone without JavaScript.
const BIRTHDAY = { year: 2008, month: 9, day: 23 };

// Today's date in Yogyakarta, so the age ticks over on his birthday there.
function today() {
  const now = new Date();
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Jakarta', year: 'numeric', month: 'numeric', day: 'numeric',
    }).formatToParts(now);
    const get = (type) => Number(parts.find((p) => p.type === type).value);
    return { year: get('year'), month: get('month'), day: get('day') };
  } catch {
    return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
  }
}

export function age(on = today()) {
  const hadBirthday = on.month > BIRTHDAY.month || (on.month === BIRTHDAY.month && on.day >= BIRTHDAY.day);
  return on.year - BIRTHDAY.year - (hadBirthday ? 0 : 1);
}

// "an 18-year-old", but "a 19-year-old".
function article(n) {
  return n === 11 || n === 18 || String(n).startsWith('8') ? 'an' : 'a';
}

// <span data-age>18</span> becomes the age.
// <span data-age="article">an 18</span> becomes the age with "a" or "an" in front.
export function initAge() {
  const n = age();
  document.querySelectorAll('[data-age]').forEach((el) => {
    el.textContent = el.dataset.age === 'article' ? `${article(n)} ${n}` : String(n);
  });
}
