(function(){
  if (document.getElementById('autoLikePanel')) return;

  const style = `
    #autoLikePanel {
      position: fixed; top: 20px; right: 20px; background: #1c1c1c; color: #fff;
      padding: 12px; z-index: 99999; font-family: sans-serif; border-radius: 8px;
      box-shadow: 0 0 12px rgba(0,0,0,0.6); width: 250px; font-size: 13px;
    }
    #autoLikePanel input, #autoLikePanel select {
      width: 100%; margin: 5px 0; padding: 6px; border: none;
      background: #333; color: #fff; border-radius: 4px;
    }
    #autoLikePanel button {
      margin-top: 8px; padding: 6px 10px; border: none;
      border-radius: 4px; cursor: pointer;
    }
    #autoLikePanel .btn-start { background: #4caf50; color: white; }
    #autoLikePanel .btn-stop { background: #f44336; color: white; }
    #autoLikePanel .close-btn {
      position: absolute; top: 4px; right: 8px; cursor: pointer;
      font-weight: bold; color: red;
    }
  `;
  const html = `
    <div id="autoLikePanel">
      <div class="close-btn" onclick="document.getElementById('autoLikePanel').remove()">×</div>
      <label>Target:
        <select id="targetType">
          <option value="followers">Followers</option>
          <option value="following">Following</option>
        </select>
      </label>
      <label>Jumlah user:
        <input type="number" id="userLimit" value="5" min="1" />
      </label>
      <label>Delay (detik):
        <input type="number" id="delaySec" value="5" min="1" />
      </label>
      <label><input type="checkbox" id="randomDelay" /> Delay acak (5–10s)</label>
      <button class="btn-start" id="startBtn">▶ Start</button>
      <button class="btn-stop" id="stopBtn">■ Stop</button>
      <div style="margin-top:8px;">
        ✅ Sukses: <span id="successCount">0</span><br>
        ❌ Gagal: <span id="failCount">0</span><br>
        🔄 Status: <span id="likeStatus">idle</span>
      </div>
    </div>
  `;

  const s = document.createElement('style'); s.innerHTML = style; document.head.appendChild(s);
  const d = document.createElement('div'); d.innerHTML = html; document.body.appendChild(d.firstElementChild);

  let stopFlag = false;
  const $ = id => document.getElementById(id);
  const delay = ms => new Promise(res => setTimeout(res, ms));

  const likePost = async username => {
    try {
      const res = await fetch(`https://www.instagram.com/${username}/?__a=1&__d=dis`);
      const data = await res.json();
      const edges = data?.graphql?.user?.edge_owner_to_timeline_media?.edges;
      if (!edges || edges.length === 0) return false;
      const postId = edges[0].node.id;
      const token = document.cookie.match(/csrftoken=([^;]+)/)?.[1];
      const likeRes = await fetch(`https://www.instagram.com/web/likes/${postId}/like/`, {
        method: "POST",
        headers: {
          "x-requested-with": "XMLHttpRequest",
          "x-csrftoken": token,
          "content-type": "application/x-www-form-urlencoded"
        },
        credentials: "include"
      });
      return likeRes.ok;
    } catch {
      return false;
    }
  };

  async function getUsers(limit) {
    const list = document.querySelector('[role="dialog"] ul');
    if (!list) return [];
    for (let i = 0; i < 20; i++) {
      list.scrollTo(0, list.scrollHeight);
      await delay(600);
      const items = list.querySelectorAll('a[href^="/"]');
      if (items.length >= limit) break;
    }
    const users = [...new Set(
      [...list.querySelectorAll('a[href^="/"]')]
        .map(a => a.getAttribute('href'))
        .filter(h => /^\/[^\/]+\/$/.test(h))
        .map(h => h.replace(/\//g, ''))
    )];
    return users.slice(0, limit);
  }

  $('startBtn').onclick = async () => {
    stopFlag = false;
    const limit = parseInt($('userLimit').value);
    const dSec = parseInt($('delaySec').value);
    const useRandom = $('randomDelay').checked;

    $('successCount').textContent = '0';
    $('failCount').textContent = '0';
    $('likeStatus').textContent = 'mengambil daftar...';

    const users = await getUsers(limit);
    if (!users.length) {
      $('likeStatus').textContent = 'Gagal ambil user!';
      return;
    }

    let success = 0, fail = 0;
    for (let i = 0; i < users.length && !stopFlag; i++) {
      const ok = await likePost(users[i]);
      if (ok) success++;
      else fail++;
      $('successCount').textContent = success;
      $('failCount').textContent = fail;
      $('likeStatus').textContent = `(${i+1}/${users.length}) @${users[i]}`;
      const delayNow = useRandom ? (5000 + Math.random() * 5000) : dSec * 1000;
      await delay(delayNow);
    }

    $('likeStatus').textContent = stopFlag ? '⛔ Dihentikan' : '✅ Selesai';
  };

  $('stopBtn').onclick = () => {
    stopFlag = true;
    $('likeStatus').textContent = '⛔ Dihentikan';
  };
})();
