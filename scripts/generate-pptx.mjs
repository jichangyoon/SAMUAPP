import pptxgen from 'pptxgenjs';
import https from 'https';
import http from 'http';

const C = {
  bg: '07070f', s1: '0f0f1e', s2: '161628', s3: '1e1e36',
  tx: 'f0f0ff', mu: '7070a0',
  p: '9945FF', g: '14F195', b: '00C2FF', o: 'FF6B35',
};

const W = 13.33, H = 7.5;

function fetchImageBase64(url) {
  return new Promise((resolve) => {
    const proto = url.startsWith('https') ? https : http;
    proto.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchImageBase64(res.headers.location).then(resolve);
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        const ct = res.headers['content-type'] || 'image/png';
        const ext = ct.includes('jpeg') || ct.includes('jpg') ? 'jpg' : 'png';
        resolve({ data: buf.toString('base64'), ext });
      });
      res.on('error', () => resolve(null));
    }).on('error', () => resolve(null));
  });
}

function eyebrow(slide, text) {
  slide.addText(text.toUpperCase(), {
    x: 0, y: 0.35, w: W, h: 0.3,
    fontSize: 9, bold: true, color: C.g,
    align: 'center', charSpacing: 4,
  });
}

function heading(slide, lines, y = 1.05) {
  slide.addText(lines, {
    x: 0.8, y, w: W - 1.6, h: 1.4,
    fontSize: 32, bold: true, color: C.tx,
    align: 'center', lineSpacingMultiple: 1.15,
  });
}

function sub(slide, text, y = 2.6) {
  slide.addText(text, {
    x: 1.2, y, w: W - 2.4, h: 0.7,
    fontSize: 13, color: C.mu,
    align: 'center', lineSpacingMultiple: 1.5,
  });
}

function bgRect(slide) {
  slide.addShape('rect', { x: 0, y: 0, w: W, h: H, fill: { color: C.bg } });
}

function card(slide, x, y, w, h, opts = {}) {
  slide.addShape('rect', {
    x, y, w, h,
    fill: { color: C.s2 },
    line: { color: opts.borderColor || '2a2a44', width: 1 },
    rectRadius: 0.12,
  });
}

async function main() {
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'SAMU Protocol';
  pptx.title = 'SAMU Protocol — Community IP on Solana';

  // Fetch images
  console.log('Fetching images...');
  const imgs = {};
  const imageUrls = {
    mickey: 'https://upload.wikimedia.org/wikipedia/en/d/d4/Mickey_Mouse.png',
    luxo: 'https://upload.wikimedia.org/wikipedia/en/thumb/5/5d/Luxo_Jr._character.png/220px-Luxo_Jr._character.png',
    panda: 'https://upload.wikimedia.org/wikipedia/en/7/76/Kung_fu_panda.png',
    doge: 'https://assets.coingecko.com/coins/images/5/large/dogecoin.png',
    wif: 'https://assets.coingecko.com/coins/images/33566/large/dogwifhat.png',
    bonk: 'https://assets.coingecko.com/coins/images/28600/large/bonk.jpg',
    pepe: 'https://assets.coingecko.com/coins/images/29850/large/pepe-token.jpeg',
    bome: 'https://assets.coingecko.com/coins/images/34238/large/bome.png',
  };
  for (const [key, url] of Object.entries(imageUrls)) {
    process.stdout.write(`  Fetching ${key}...`);
    imgs[key] = await fetchImageBase64(url);
    console.log(imgs[key] ? ' ✓' : ' ✗ (skipped)');
  }

  // ── SLIDE 1: WHAT IS IP? ──────────────────────────────────────────────────
  {
    const s = pptx.addSlide();
    bgRect(s);
    eyebrow(s, 'Solana Hackathon 2026');
    s.addText([
      { text: 'What is ', options: { color: C.tx } },
      { text: 'IP', options: { color: C.p } },
      { text: '?', options: { color: C.tx } },
    ], { x: 0.8, y: 0.8, w: W - 1.6, h: 1.2, fontSize: 52, bold: true, align: 'center' });
    s.addText('IP = Intellectual Property\nA character. A story. A brand. Something people love enough to pay for.', {
      x: 1.5, y: 2.1, w: W - 3, h: 0.9,
      fontSize: 14, color: C.mu, align: 'center', lineSpacingMultiple: 1.5,
    });
    const cols = [
      { label: 'Story', sub: 'Creative energy', color: C.g },
      { label: '+', sub: '', color: C.mu },
      { label: 'Community', sub: 'Fans who care', color: C.p },
      { label: '+', sub: '', color: C.mu },
      { label: 'Revenue Cycle', sub: 'Goods → money → more story', color: C.b },
      { label: '=', sub: '', color: C.mu },
      { label: 'Billion-Dollar IP', sub: "That's how IP works", color: C.g },
    ];
    const totalW = W - 2;
    const colW = totalW / cols.length;
    const startX = 1;
    card(s, startX - 0.2, 3.2, totalW + 0.4, 2.0);
    cols.forEach((col, i) => {
      s.addText(col.label, {
        x: startX + i * colW, y: 3.5, w: colW, h: 0.5,
        fontSize: col.label.length <= 1 ? 20 : 14, bold: true, color: col.color, align: 'center',
      });
      if (col.sub) {
        s.addText(col.sub, {
          x: startX + i * colW, y: 4.1, w: colW, h: 0.4,
          fontSize: 9, color: C.mu, align: 'center',
        });
      }
    });
    s.addText('On Solana, meme communities already have the story and the fans. They\'re missing the revenue cycle.', {
      x: 1.5, y: 5.4, w: W - 3, h: 0.6,
      fontSize: 12, color: C.mu, align: 'center', lineSpacingMultiple: 1.4,
    });
  }

  // ── SLIDE 2: MICKEY MOUSE → DISNEY ───────────────────────────────────────
  {
    const s = pptx.addSlide();
    bgRect(s);
    eyebrow(s, 'What is IP?');
    s.addText('1928. One sketch.', {
      x: 0.8, y: 0.8, w: W * 0.38, h: 0.4,
      fontSize: 13, color: C.mu, align: 'center',
    });
    if (imgs.mickey) {
      s.addImage({ data: `data:image/${imgs.mickey.ext};base64,${imgs.mickey.data}`, x: 1.0, y: 1.3, w: 3.2, h: 3.2, sizing: { type: 'contain', w: 3.2, h: 3.2 } });
    } else {
      s.addText('🐭', { x: 1.0, y: 1.3, w: 3.2, h: 3.2, fontSize: 80, align: 'center', valign: 'middle' });
    }
    s.addText('→', { x: 4.4, y: 2.5, w: 1.2, h: 1.2, fontSize: 52, bold: true, color: C.g, align: 'center', valign: 'middle' });
    s.addText('The Walt Disney Company', { x: 5.8, y: 2.0, w: W - 6.2, h: 0.5, fontSize: 13, color: C.mu, align: 'center', charSpacing: 2 });
    s.addText('$200B+', {
      x: 5.8, y: 2.55, w: W - 6.2, h: 1.3,
      fontSize: 64, bold: true, color: C.p, align: 'center',
    });
    s.addText('empire built on one character', { x: 5.8, y: 3.9, w: W - 6.2, h: 0.4, fontSize: 13, color: C.mu, align: 'center' });
  }

  // ── SLIDE 3: PIXAR + DREAMWORKS ──────────────────────────────────────────
  {
    const s = pptx.addSlide();
    bgRect(s);
    eyebrow(s, 'What is IP?');
    s.addText("It wasn't just Disney.", { x: 0.8, y: 0.8, w: W - 1.6, h: 0.4, fontSize: 16, color: C.mu, align: 'center' });
    // Pixar
    if (imgs.luxo) {
      s.addImage({ data: `data:image/${imgs.luxo.ext};base64,${imgs.luxo.data}`, x: 1.2, y: 1.4, w: 2.6, h: 2.6, sizing: { type: 'contain', w: 2.6, h: 2.6 } });
    } else {
      s.addText('💡', { x: 1.2, y: 1.4, w: 2.6, h: 2.6, fontSize: 72, align: 'center', valign: 'middle' });
    }
    s.addText('PIXAR', { x: 1.2, y: 4.1, w: 2.6, h: 0.35, fontSize: 10, color: C.mu, align: 'center', charSpacing: 3 });
    s.addText('$7.4B', { x: 1.2, y: 4.5, w: 2.6, h: 0.7, fontSize: 40, bold: true, color: C.g, align: 'center' });
    s.addText('1986. One desk lamp.\nAcquired by Disney.', { x: 1.2, y: 5.25, w: 2.6, h: 0.6, fontSize: 10, color: C.mu, align: 'center', lineSpacingMultiple: 1.4 });
    // Divider
    s.addText('&', { x: 5.9, y: 2.8, w: 1.5, h: 0.8, fontSize: 36, color: C.mu, align: 'center', bold: true });
    // DreamWorks
    if (imgs.panda) {
      s.addImage({ data: `data:image/${imgs.panda.ext};base64,${imgs.panda.data}`, x: 7.5, y: 1.4, w: 2.6, h: 2.6, sizing: { type: 'contain', w: 2.6, h: 2.6 } });
    } else {
      s.addText('🐼', { x: 7.5, y: 1.4, w: 2.6, h: 2.6, fontSize: 72, align: 'center', valign: 'middle' });
    }
    s.addText('DREAMWORKS', { x: 7.5, y: 4.1, w: 2.6, h: 0.35, fontSize: 10, color: C.mu, align: 'center', charSpacing: 3 });
    s.addText('$3.8B', { x: 7.5, y: 4.5, w: 2.6, h: 0.7, fontSize: 40, bold: true, color: C.p, align: 'center' });
    s.addText('2008. One panda.\nAcquired by Comcast.', { x: 7.5, y: 5.25, w: 2.6, h: 0.6, fontSize: 10, color: C.mu, align: 'center', lineSpacingMultiple: 1.4 });
    s.addText('One character. One story.  →  Billion-dollar empire.', {
      x: 1.0, y: 6.2, w: W - 2.0, h: 0.5, fontSize: 16, bold: true, color: C.tx, align: 'center',
    });
  }

  // ── SLIDE 4: WEB3 REVERSAL ────────────────────────────────────────────────
  {
    const s = pptx.addSlide();
    bgRect(s);
    eyebrow(s, 'The Opportunity');
    s.addText([
      { text: 'What about ', options: { color: C.tx } },
      { text: 'Web3?', options: { color: C.g } },
    ], { x: 0.8, y: 0.7, w: W - 1.6, h: 0.9, fontSize: 38, bold: true, align: 'center' });
    const coins = [
      { key: 'doge', label: 'DOGE' },
      { key: 'wif', label: 'WIF' },
      { key: 'bonk', label: 'BONK' },
      { key: 'pepe', label: 'PEPE' },
      { key: 'bome', label: 'BOME' },
    ];
    const coinW = 1.5, coinGap = 0.4;
    const totalW = coins.length * (coinW + coinGap) - coinGap;
    const startX = (W - totalW) / 2;
    coins.forEach((coin, i) => {
      const x = startX + i * (coinW + coinGap);
      if (imgs[coin.key]) {
        s.addImage({ data: `data:image/${imgs[coin.key].ext};base64,${imgs[coin.key].data}`, x, y: 1.8, w: coinW, h: coinW, sizing: { type: 'contain', w: coinW, h: coinW } });
      } else {
        const emojis = { doge: '🐕', wif: '🎩', bonk: '🐶', pepe: '🐸', bome: '📖' };
        s.addText(emojis[coin.key] || '●', { x, y: 1.8, w: coinW, h: coinW, fontSize: 40, align: 'center', valign: 'middle' });
      }
      s.addText(coin.label, { x, y: 3.5, w: coinW, h: 0.35, fontSize: 11, bold: true, color: C.mu, align: 'center', charSpacing: 1.5 });
    });
    card(s, 1.5, 4.1, W - 3, 2.2, { borderColor: 'FF6B35' });
    s.addShape('rect', { x: 1.5, y: 4.1, w: W - 3, h: 2.2, fill: { color: '1a0a05' }, line: { color: '803519', width: 1 }, rectRadius: 0.1 });
    s.addText('Billions in market cap. Zero IP monetization.', {
      x: 1.8, y: 4.4, w: W - 3.6, h: 0.6, fontSize: 22, bold: true, color: C.o, align: 'center',
    });
    s.addText('They have the characters, the communities, the cultural energy.\nThey\'re missing the revenue cycle.', {
      x: 1.8, y: 5.1, w: W - 3.6, h: 0.8, fontSize: 12, color: C.mu, align: 'center', lineSpacingMultiple: 1.5,
    });
  }

  // ── SLIDE 5: HOOK ─────────────────────────────────────────────────────────
  {
    const s = pptx.addSlide();
    bgRect(s);
    eyebrow(s, 'The Opportunity');
    s.addText([
      { text: 'Memecoins are\n', options: { color: C.tx } },
      { text: 'community-born IPs.', options: { color: C.p } },
    ], { x: 0.8, y: 0.8, w: W - 1.6, h: 1.6, fontSize: 36, bold: true, align: 'center', lineSpacingMultiple: 1.2 });
    s.addText('BONK became a cultural movement. WIF built a global fanbase.\nThese are IPs — with passionate communities and viral creative energy.', {
      x: 1.5, y: 2.6, w: W - 3, h: 0.9, fontSize: 14, color: C.mu, align: 'center', lineSpacingMultiple: 1.5,
    });
    s.addShape('rect', { x: 2, y: 3.7, w: W - 4, h: 1.6, fill: { color: '1a0a05' }, line: { color: C.o, width: 1 }, rectRadius: 0.1 });
    s.addText('But most of them just die.', { x: 2.3, y: 3.95, w: W - 4.6, h: 0.55, fontSize: 24, bold: true, color: C.o, align: 'center' });
    s.addText('No infrastructure to capture and compound that value.', { x: 2.3, y: 4.6, w: W - 4.6, h: 0.4, fontSize: 12, color: C.mu, align: 'center' });
    s.addText('$60B+ Memecoin Market Cap   ·   Millions of Creators & Voters', {
      x: 1.5, y: 5.6, w: W - 3, h: 0.4, fontSize: 11, bold: true, color: C.g, align: 'center',
    });
  }

  // ── SLIDE 6: PROBLEM ──────────────────────────────────────────────────────
  {
    const s = pptx.addSlide();
    bgRect(s);
    eyebrow(s, 'Problem');
    s.addText([
      { text: 'The community creative energy\n', options: { color: C.tx } },
      { text: 'evaporates on Twitter.', options: { color: C.p } },
    ], { x: 0.8, y: 0.7, w: W - 1.6, h: 1.3, fontSize: 28, bold: true, align: 'center', lineSpacingMultiple: 1.2 });
    const cards3 = [
      { ic: '🎨', title: 'Meme Creator', body: 'My meme went viral and pumped the token. I get zero revenue. No way to prove or monetize my IP.' },
      { ic: '🗳️', title: 'Community Voter', body: 'I curate great memes and build community culture. No reward structure. Not enough reason to stay engaged.' },
      { ic: '🏭', title: 'Project Team', body: 'We want to turn memes into real goods. No pipeline. Everything done manually, one-off, no scale.' },
    ];
    const cw = 3.5, cx0 = (W - 3 * cw - 2 * 0.3) / 2;
    cards3.forEach((c3, i) => {
      const x = cx0 + i * (cw + 0.3);
      card(s, x, 2.1, cw, 3.5);
      s.addText(c3.ic, { x, y: 2.3, w: cw, h: 0.7, fontSize: 28, align: 'center' });
      s.addText(c3.title, { x: x + 0.15, y: 3.1, w: cw - 0.3, h: 0.5, fontSize: 14, bold: true, color: C.tx, align: 'center' });
      s.addText(c3.body, { x: x + 0.15, y: 3.7, w: cw - 0.3, h: 1.6, fontSize: 11, color: C.mu, align: 'center', lineSpacingMultiple: 1.4, wrap: true });
    });
    s.addText('No infrastructure to convert community energy into lasting value.', {
      x: 1.5, y: 5.9, w: W - 3, h: 0.4, fontSize: 12, bold: true, color: C.tx, align: 'center',
    });
  }

  // ── SLIDE 7: SOLUTION ─────────────────────────────────────────────────────
  {
    const s = pptx.addSlide();
    bgRect(s);
    eyebrow(s, 'Solution');
    s.addText([
      { text: 'SAMU Protocol:\n', options: { color: C.tx } },
      { text: 'Meme → IP → Goods → On-Chain Revenue', options: { color: C.g } },
    ], { x: 0.8, y: 0.7, w: W - 1.6, h: 1.5, fontSize: 26, bold: true, align: 'center', lineSpacingMultiple: 1.2 });
    sub(s, 'Capture community energy. Archive it as IP. Connect to goods. Distribute revenue back to the creators.', 2.3);
    const steps = ['🎨 Upload Meme', '🗳️ Token Vote', '🏆 IP Archive', '🛍️ Goods', '💰 SOL Distributed'];
    const subs2 = ['Community contest', 'SPL token staking', 'On-chain record', 'Printful automation', 'Anchor smart contract'];
    const sw = 2.0, sg = 0.12, arW = 0.3;
    const totalSW = steps.length * sw + (steps.length - 1) * (arW + sg * 2);
    let sx = (W - totalSW) / 2;
    steps.forEach((st, i) => {
      card(s, sx, 3.1, sw, 1.3);
      s.addText(st, { x: sx + 0.05, y: 3.25, w: sw - 0.1, h: 0.55, fontSize: 11, bold: true, color: C.tx, align: 'center', wrap: true });
      s.addText(subs2[i], { x: sx + 0.05, y: 3.85, w: sw - 0.1, h: 0.4, fontSize: 9, color: C.mu, align: 'center' });
      sx += sw;
      if (i < steps.length - 1) {
        s.addText('→', { x: sx + sg, y: 3.5, w: arW, h: 0.5, fontSize: 16, color: C.g, align: 'center', bold: true });
        sx += arW + sg * 2;
      }
    });
    const splits = [{ pct: '45%', label: 'Creator', color: C.g }, { pct: '40%', label: 'Voter', color: C.p }, { pct: '15%', label: 'Platform', color: C.b }];
    const bw = 2.4, bx0 = (W - 3 * bw - 2 * 0.4) / 2;
    card(s, bx0 - 0.3, 4.7, 3 * bw + 2 * 0.4 + 0.6, 1.5);
    splits.forEach((sp, i) => {
      const x = bx0 + i * (bw + 0.4);
      s.addText(sp.pct, { x, y: 4.85, w: bw, h: 0.7, fontSize: 32, bold: true, color: sp.color, align: 'center' });
      s.addText(sp.label, { x, y: 5.6, w: bw, h: 0.35, fontSize: 11, color: C.mu, align: 'center' });
    });
  }

  // ── SLIDE 8: HOW IT WORKS ─────────────────────────────────────────────────
  {
    const s = pptx.addSlide();
    bgRect(s);
    eyebrow(s, 'How It Works');
    s.addText([
      { text: 'Three stakeholders. ', options: { color: C.tx } },
      { text: 'One flywheel.', options: { color: C.g } },
    ], { x: 0.8, y: 0.7, w: W - 1.6, h: 0.9, fontSize: 30, bold: true, align: 'center' });
    const stakes = [
      { role: 'CREATOR', color: C.g, title: 'Upload your meme', body: 'Submit original meme to community contest. Community votes with tokens to pick the best.', earn: 'Earns: 45% of goods revenue — proportional to votes received' },
      { role: 'VOTER', color: C.p, title: 'Stake tokens to vote', body: 'Use community SPL tokens to vote for the best memes. Shape what becomes the official IP.', earn: 'Earns: 40% of goods revenue — proportional to tokens staked' },
      { role: 'TEAM', color: C.b, title: 'Run the protocol', body: 'Winning meme is archived on-chain, printed via Printful, and listed as goods automatically.', earn: 'Earns: 15% — sustains the protocol infrastructure' },
    ];
    const sw2 = 3.6, sx0 = (W - 3 * sw2 - 2 * 0.3) / 2;
    stakes.forEach((st, i) => {
      const x = sx0 + i * (sw2 + 0.3);
      card(s, x, 1.8, sw2, 4.5, { borderColor: st.color });
      s.addText(st.role, { x: x + 0.15, y: 2.0, w: sw2 - 0.3, h: 0.4, fontSize: 10, bold: true, color: st.color, charSpacing: 2, align: 'left' });
      s.addText(st.title, { x: x + 0.15, y: 2.45, w: sw2 - 0.3, h: 0.55, fontSize: 16, bold: true, color: C.tx, align: 'left', wrap: true });
      s.addText(st.body, { x: x + 0.15, y: 3.1, w: sw2 - 0.3, h: 1.6, fontSize: 11, color: C.mu, lineSpacingMultiple: 1.4, wrap: true });
      s.addText(st.earn, { x: x + 0.15, y: 4.9, w: sw2 - 0.3, h: 0.6, fontSize: 11, bold: true, color: st.color, wrap: true });
    });
    s.addText('When a customer buys the goods → Anchor escrow releases → SOL hits all three wallets simultaneously', {
      x: 1.0, y: 6.55, w: W - 2, h: 0.35, fontSize: 11, color: C.mu, align: 'center',
    });
  }

  // ── SLIDE 9: PROTOCOL DESIGN ──────────────────────────────────────────────
  {
    const s = pptx.addSlide();
    bgRect(s);
    eyebrow(s, 'Protocol Design');
    s.addText([
      { text: 'Token-agnostic.\n', options: { color: C.tx } },
      { text: 'Any community can onboard.', options: { color: C.g } },
    ], { x: 0.8, y: 0.7, w: W - 1.6, h: 1.4, fontSize: 30, bold: true, align: 'center', lineSpacingMultiple: 1.2 });
    sub(s, 'SAMU is the first IP. BONK, WIF — any community with an SPL token can run their own contest.', 2.2);
    const comms = [
      { token: 'SAMU', desc: 'First community\nContest live on mainnet', status: '✅ LIVE', color: C.g },
      { token: 'BONK', desc: "Solana's flagship memecoin\nCommunity ready to onboard", status: '→ NEXT', color: C.o },
      { token: 'WIF', desc: 'Global memecoin\nGoods pipeline compatible', status: '→ NEXT', color: C.b },
      { token: '+MORE', desc: 'Curated communities\nQuality-gated onboarding', status: 'PHASE 4', color: C.p },
    ];
    const cw2 = 2.7, cg = 0.3, cx0b = (W - 4 * cw2 - 3 * cg) / 2;
    comms.forEach((c2, i) => {
      const x = cx0b + i * (cw2 + cg);
      card(s, x, 3.0, cw2, 2.8, { borderColor: c2.color });
      s.addText(c2.token, { x: x + 0.1, y: 3.2, w: cw2 - 0.2, h: 0.6, fontSize: 22, bold: true, color: c2.color, align: 'center' });
      s.addText(c2.desc, { x: x + 0.1, y: 3.9, w: cw2 - 0.2, h: 0.7, fontSize: 10, color: C.mu, align: 'center', lineSpacingMultiple: 1.4 });
      s.addText(c2.status, { x: x + 0.1, y: 4.8, w: cw2 - 0.2, h: 0.35, fontSize: 10, bold: true, color: c2.color, align: 'center', charSpacing: 1.5 });
    });
    s.addText('IP copyright risk management is the moat.', {
      x: 1.5, y: 6.2, w: W - 3, h: 0.4, fontSize: 13, bold: true, color: C.tx, align: 'center',
    });
  }

  // ── SLIDE 10: TRACTION ────────────────────────────────────────────────────
  {
    const s = pptx.addSlide();
    bgRect(s);
    eyebrow(s, 'Traction — Mainnet Verified');
    s.addText([
      { text: 'Full pipeline validated\n', options: { color: C.tx } },
      { text: 'on Solana mainnet.', options: { color: C.g } },
    ], { x: 0.8, y: 0.7, w: W - 1.6, h: 1.4, fontSize: 30, bold: true, align: 'center', lineSpacingMultiple: 1.2 });
    const metrics = [
      { num: '471', label: 'Wallets Joined', color: C.g },
      { num: '81', label: 'Memes Uploaded', color: C.p },
      { num: '220M', label: 'SAMU Votes Cast', color: C.b },
      { num: '0.61 SOL', label: 'SOL Distributed', color: 'FFD700' },
    ];
    const mw = 2.6, mg = 0.35, mx0 = (W - 4 * mw - 3 * mg) / 2;
    metrics.forEach((m, i) => {
      const x = mx0 + i * (mw + mg);
      card(s, x, 2.4, mw, 2.2);
      s.addText(m.num, { x: x + 0.1, y: 2.6, w: mw - 0.2, h: 1.1, fontSize: 38, bold: true, color: m.color, align: 'center' });
      s.addText(m.label, { x: x + 0.1, y: 3.75, w: mw - 0.2, h: 0.5, fontSize: 11, color: C.mu, align: 'center' });
    });
    s.addText('End-to-end pipeline live and verified on Solana mainnet.', {
      x: 1.5, y: 4.9, w: W - 3, h: 0.4, fontSize: 13, bold: true, color: C.g, align: 'center',
    });
    s.addText('Program ID: GYfzt1mzWNMurBEej4557YbKmceTWwW3L6attC7pAmWS', {
      x: 1.5, y: 5.55, w: W - 3, h: 0.35, fontSize: 10, color: C.mu, align: 'center',
    });
  }

  // ── SLIDE 11: ARCHITECTURE ────────────────────────────────────────────────
  {
    const s = pptx.addSlide();
    bgRect(s);
    eyebrow(s, 'Architecture');
    s.addText([{ text: 'Protocol ', options: { color: C.tx } }, { text: 'Layer Diagram', options: { color: C.g } }], {
      x: 0.8, y: 0.7, w: W - 1.6, h: 0.8, fontSize: 30, bold: true, align: 'center',
    });
    const layers = [
      { label: 'COMMUNITY', items: ['SAMU Community', 'BONK Community (soon)', 'WIF Community (soon)', 'Any SPL Token...'], colors: [C.g, C.mu, C.mu, C.mu] },
      { label: 'PROTOCOL', items: ['Contest Engine', 'SPL Voting', 'IP Archive (R2)', 'Printful Automation'], colors: [C.p, C.p, C.p, C.p] },
      { label: 'ON-CHAIN', items: ['Anchor Escrow PDA', 'Auto Distribution Contract', 'Blinks (vote from X)'], colors: [C.b, C.b, C.b] },
      { label: 'RECIPIENTS', items: ['Creator 45% SOL', 'Voter 40% SOL', 'Platform 15% SOL'], colors: [C.g, C.p, C.b] },
    ];
    layers.forEach((layer, li) => {
      const y = 1.8 + li * 1.2;
      s.addText(layer.label, { x: 0.3, y: y + 0.1, w: 1.3, h: 0.4, fontSize: 9, bold: true, color: C.mu, align: 'right', charSpacing: 1.5 });
      const iw = (W - 2.2) / layer.items.length - 0.15;
      layer.items.forEach((item, ii) => {
        const ix = 1.8 + ii * (iw + 0.15);
        card(s, ix, y, iw, 0.75, { borderColor: layer.colors[ii] });
        s.addText(item, { x: ix + 0.1, y: y + 0.15, w: iw - 0.2, h: 0.45, fontSize: 10, bold: true, color: layer.colors[ii], align: 'center', wrap: true });
      });
      if (li < layers.length - 1) {
        s.addText('↓', { x: W / 2 - 0.3, y: y + 0.82, w: 0.6, h: 0.3, fontSize: 14, color: C.mu, align: 'center' });
      }
    });
  }

  // ── SLIDE 12: MARKET OPPORTUNITY ──────────────────────────────────────────
  {
    const s = pptx.addSlide();
    bgRect(s);
    eyebrow(s, 'Market Opportunity');
    s.addText([{ text: 'Three massive markets. ', options: { color: C.tx } }, { text: 'One protocol.', options: { color: C.g } }], {
      x: 0.8, y: 0.7, w: W - 1.6, h: 0.9, fontSize: 30, bold: true, align: 'center',
    });
    const mkts = [
      { sz: '$60B+', nm: 'Memecoin\nMarket Cap', color: C.p },
      { sz: '$250B', nm: 'Creator Economy\n(2025 Estimate)', color: C.g },
      { sz: '$400B', nm: 'Global Merchandise\nMarket', color: C.b },
    ];
    const mw2 = 3.5, mg2 = 0.5, mx02 = (W - 3 * mw2 - 2 * mg2) / 2;
    mkts.forEach((m, i) => {
      const x = mx02 + i * (mw2 + mg2);
      s.addShape('rect', { x, y: 1.85, w: mw2, h: 2.8, fill: { color: C.s2 }, line: { color: m.color, width: 3 }, rectRadius: 0.1 });
      s.addText(m.sz, { x: x + 0.1, y: 2.1, w: mw2 - 0.2, h: 1.0, fontSize: 38, bold: true, color: m.color, align: 'center' });
      s.addText(m.nm, { x: x + 0.1, y: 3.2, w: mw2 - 0.2, h: 0.8, fontSize: 13, color: C.mu, align: 'center', lineSpacingMultiple: 1.4 });
    });
    card(s, 1.5, 5.0, W - 3, 1.6);
    s.addText("Tens of millions of memecoin holders are building communities, creating memes, voting —\nbut there's no infrastructure to convert that energy into lasting value.\nSAMU Protocol is that infrastructure.", {
      x: 1.8, y: 5.15, w: W - 3.6, h: 1.2, fontSize: 12, color: C.mu, align: 'center', lineSpacingMultiple: 1.45,
    });
  }

  // ── SLIDE 13: WHY SOLANA ──────────────────────────────────────────────────
  {
    const s = pptx.addSlide();
    bgRect(s);
    eyebrow(s, 'Why Solana');
    s.addText([{ text: 'Memes need ', options: { color: C.tx } }, { text: 'speed and scale.', options: { color: C.g } }], {
      x: 0.8, y: 0.7, w: W - 1.6, h: 0.9, fontSize: 30, bold: true, align: 'center',
    });
    const reasons = [
      { t: '⚡ 65,000 TPS · 400ms', d: 'Voting feels instant. Memes live and die in minutes — speed is everything.' },
      { t: '💸 $0.00025 per tx', d: 'Micro-votes aren\'t eaten by gas. Every vote counts.' },
      { t: '🔗 Solana Blinks', d: 'Vote directly from X (Twitter) without opening an app.' },
      { t: '🌿 cNFT (Bubblegum)', d: 'Phase 3: Mint millions of IP equity NFTs for near-zero cost.' },
      { t: '💎 SPL Token Ecosystem', d: 'Every memecoin is SPL-based. Swap the token config — new community instantly.' },
      { t: '⚓ Anchor Framework', d: 'Escrow PDA, auto-distribution — live on mainnet.' },
    ];
    const cols2 = 2, rows = Math.ceil(reasons.length / cols2);
    const rw = (W - 1.6) / cols2 - 0.2, rh = (H - 2.2) / rows - 0.15;
    const rx0 = 0.8;
    reasons.forEach((r, i) => {
      const col = i % cols2, row = Math.floor(i / cols2);
      const x = rx0 + col * (rw + 0.2);
      const y = 2.0 + row * (rh + 0.15);
      s.addShape('rect', { x, y, w: rw, h: rh, fill: { color: C.s2 }, line: { color: C.g, width: 2 }, rectRadius: 0 });
      s.addShape('rect', { x, y, w: 0.04, h: rh, fill: { color: C.g }, line: { color: C.g, width: 0 } });
      s.addText(r.t, { x: x + 0.2, y: y + 0.15, w: rw - 0.3, h: 0.4, fontSize: 12, bold: true, color: C.tx });
      s.addText(r.d, { x: x + 0.2, y: y + 0.55, w: rw - 0.3, h: rh - 0.65, fontSize: 10, color: C.mu, lineSpacingMultiple: 1.3, wrap: true });
    });
  }

  // ── SLIDE 14: TOKEN ECONOMICS ─────────────────────────────────────────────
  {
    const s = pptx.addSlide();
    bgRect(s);
    eyebrow(s, 'Token Economics');
    s.addText([{ text: '85% goes back to the people\n', options: { color: C.tx } }, { text: 'who created the value.', options: { color: C.g } }], {
      x: 0.8, y: 0.65, w: W - 1.6, h: 1.4, fontSize: 28, bold: true, align: 'center', lineSpacingMultiple: 1.2,
    });
    // Simple pie-like visual with rectangles
    const splits = [
      { pct: '45%', label: 'Creator', desc: 'SOL distributed proportional to votes received', color: C.g },
      { pct: '40%', label: 'Voter', desc: 'SOL distributed proportional to tokens staked', color: C.p },
      { pct: '15%', label: 'Platform', desc: 'Protocol infrastructure and operations', color: C.b },
    ];
    const sw3 = 3.4, sg3 = 0.5, sx03 = (W - 3 * sw3 - 2 * sg3) / 2;
    splits.forEach((sp, i) => {
      const x = sx03 + i * (sw3 + sg3);
      s.addShape('rect', { x, y: 2.3, w: sw3, h: 3.5, fill: { color: C.s2 }, line: { color: sp.color, width: 1 }, rectRadius: 0.1 });
      s.addShape('rect', { x, y: 2.3, w: sw3, h: 0.08, fill: { color: sp.color }, line: { color: sp.color, width: 0 } });
      s.addText(sp.pct, { x: x + 0.1, y: 2.5, w: sw3 - 0.2, h: 1.1, fontSize: 52, bold: true, color: sp.color, align: 'center' });
      s.addText(sp.label, { x: x + 0.1, y: 3.65, w: sw3 - 0.2, h: 0.55, fontSize: 18, bold: true, color: C.tx, align: 'center' });
      s.addText(sp.desc, { x: x + 0.2, y: 4.3, w: sw3 - 0.4, h: 0.9, fontSize: 11, color: C.mu, align: 'center', lineSpacingMultiple: 1.4, wrap: true });
    });
    s.addText('Same structure for every community that onboards — fair, transparent, and trustless', {
      x: 1.5, y: 6.2, w: W - 3, h: 0.4, fontSize: 12, color: C.mu, align: 'center',
    });
  }

  // ── SLIDE 15: ROADMAP + CTA ───────────────────────────────────────────────
  {
    const s = pptx.addSlide();
    bgRect(s);
    eyebrow(s, 'Roadmap');
    s.addText([{ text: 'Phase 1 & 2 done. ', options: { color: C.tx } }, { text: 'Mainnet live.', options: { color: C.g } }], {
      x: 0.8, y: 0.7, w: W - 1.6, h: 0.9, fontSize: 30, bold: true, align: 'center',
    });
    const phases = [
      { ph: 'PHASE 1', dot: '✓', title: 'SAMU Community', desc: 'Contest · goods · revenue distribution validated', done: true },
      { ph: 'PHASE 2', dot: '✓', title: 'Smart Contract', desc: 'Anchor Escrow\nMainnet Live ✅', done: true },
      { ph: 'PHASE 3', dot: '→', title: 'cNFT IP Equity', desc: 'Bubblegum — IP ownership as NFT', done: false, next: true },
      { ph: 'PHASE 4', dot: '4', title: 'Curated Listing', desc: 'Verified communities only — quality gated', done: false },
    ];
    const pw = (W - 2.0) / phases.length - 0.3, px0 = 1.0;
    phases.forEach((ph, i) => {
      const x = px0 + i * (pw + 0.3);
      s.addText(ph.ph, { x, y: 1.85, w: pw, h: 0.3, fontSize: 8, bold: true, color: C.mu, align: 'center', charSpacing: 2 });
      const dotColor = ph.done ? C.g : ph.next ? C.p : C.s3;
      const dotTextColor = ph.done ? '000000' : 'ffffff';
      s.addShape('ellipse', { x: x + pw / 2 - 0.25, y: 2.2, w: 0.5, h: 0.5, fill: { color: dotColor }, line: { color: dotColor, width: 0 } });
      s.addText(ph.dot, { x: x + pw / 2 - 0.25, y: 2.2, w: 0.5, h: 0.5, fontSize: 11, bold: true, color: dotTextColor, align: 'center', valign: 'middle' });
      if (i < phases.length - 1) {
        s.addShape('line', { x: x + pw / 2 + 0.25, y: 2.45, w: 0.3, h: 0, line: { color: C.mu, width: 1 } });
      }
      s.addText(ph.title, { x: x + 0.05, y: 2.85, w: pw - 0.1, h: 0.5, fontSize: 13, bold: true, color: C.tx, align: 'center', wrap: true });
      s.addText(ph.desc, { x: x + 0.05, y: 3.45, w: pw - 0.1, h: 0.8, fontSize: 10, color: C.mu, align: 'center', lineSpacingMultiple: 1.4, wrap: true });
    });
    s.addText('SAMU is the first IP.', { x: 1.0, y: 4.6, w: W - 2, h: 0.4, fontSize: 16, color: C.mu, align: 'center' });
    s.addText('The goal is to turn Solana into Disney.', {
      x: 0.8, y: 5.1, w: W - 1.6, h: 1.1, fontSize: 34, bold: true, color: C.p, align: 'center', lineSpacingMultiple: 1.1,
    });
    s.addText('SAMU Protocol  ·  samu.ink  ·  Solana Mainnet', {
      x: 1.0, y: 6.4, w: W - 2, h: 0.35, fontSize: 11, color: C.mu, align: 'center',
    });
  }

  // Save
  const outPath = 'public/SAMU-Protocol-Pitch-Deck.pptx';
  await pptx.writeFile({ fileName: outPath });
  console.log(`\n✅ Saved: ${outPath}`);
}

main().catch(console.error);
