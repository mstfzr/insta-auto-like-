(function(){
  if (document.getElementById('autoLikePanel')) return;

  const style = `
    #autoLikePanel {
      position: fixed; top: 20px; right: 20px; background: #1c1c1c; color: #fff;
      padding: 10px; z-index: 99999; font-family: sans-serif; border-radius: 5px;
      box-shadow: 0 0 10px rgba(0,0,0,0.5); width: 240px;
    }
    #autoLikePanel input, #autoLikePanel select {
      width: 100%; margin: 4px 0; padding: 5px;
      background: #2a2a2a; border: 1px solid #444; color: #fff;
    }
    #autoLikePanel button {
      margin: 5px 4px 0 0; padding: 5px 10px; border: none; border-radius: 3px;
    }
    #autoLikePanel .btn-start { background: #4caf50; color: white; }
    #autoLikePanel .btn-stop { background: #f44336; color: white; }
    #autoLikePanel .close-btn {
      position: absolute; top: 3px; right: 5px; cursor: pointer;
      font-weight: bold; color: red;
    }
  `;
  const html = `
    <div id="autoLikePanel">
      <div class="close-btn" onclick="document.getElementById('autoLikePanel').remove()">×</div>
      <label>Target:
        <select id="targetType"><option value="followers">Followers</option><option value="following">Following</option></select>
      </label>
      <label>Jumlah user:</label>
      <input type="number" id="userLimit" value="5" />
      <label>Delay (detik):</label>
      <input type="number" id="delaySec" value="5" />
      <label><input type="checkbox" id="randomDelay" /> Gunakan delay acak (5–10s)</label>
      <div>
        <button class="btn-start" id="startLike">▶ Start</button>
        <button class="btn-stop" id="stopLike">⏹ Stop</button>
      </div>
      <div id="statusArea" style="margin-top:8px;font-size:13px;">
        <div>✅ <span id="successCount">0</span> sukses</div>
        <div>❌ <span id="failCount">0</span> gagal</div>
        <div>Status: <span id="likeStatus">idle</span></div>
      </div>
    </div>
  `;

  const s = document.createElement('style'); s.innerHTML = style; document.head.appendChild(s);
  const d = document.createElement('div'); d.innerHTML = html; document.body.appendChild(d.firstElementChild);

  let stopFlag = false;

  const delay = ms => new Promise(res => setTimeout(res, ms));
  const updateUI = (success, fail, status) => {
    document.getElementById('successCount').innerText = success;
    document.getElementById('failCount').innerText = fail;
    document.getElementById('likeStatus').innerText = status;
  };

  const likeLatestPost = async (username) => {
    try {
      const res = await fetch(`https://www.instagram.com/${username}/?__a=1&__d=dis`);
      const data = await res.json();
      const edges = data?.graphql?.user?.edge_owner_to_timeline_media?.edges;
      if (!edges || edges.length === 0) return false;
      const postId = edges[0].node.id;
      const likeUrl = `https://www.instagram.com/web/likes/${postId}/like/`;
      const token = document.cookie.match(/csrftoken=([^;]+)/)?.[1];
      const likeRes = await fetch(likeUrl, {
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

  document.getElementById('startLike').onclick = async function() {
    stopFlag = false;
    let type = document.getElementById('targetType').value;
    let limit = parseInt(document.getElementById('userLimit').value);
    let delaySec = parseInt(document.getElementById('delaySec').value) * 1000;
    let random = document.getElementById('randomDelay').checked;
    let success = 0, fail = 0;

    document.getElementById('likeStatus').innerText = 'Mengambil data...';

    const scrollAndGetUsernames = async () => {
      let container = document.querySelector('[role="dialog"] ul')?.parentElement;
      if (!container) {
        alert("Harus membuka panel followers/following terlebih dahulu.");
        return [];
      }
      container.scrollTo(0, 0);
      await delay(500);
      for (let i = 0; i < 20; i++) {
        container.scrollTo(0, container.scrollHeight);
        await delay(700);
        if (document.querySelectorAll('[role="dialog"] a[href^="/"]').length >= limit) break;
      }
      let users = [...new Set(
        [...document.querySelectorAll('[role="dialog"] a[href^="/"]')]
          .map(a => a.getAttribute('href'))
          .filter(h => /^\/[^\/]+\/$/.test(h))
          .map(h => h.replace(/\//g, ''))
      )];
      return users.slice(0, limit);
    };

    const usernames = await scrollAndGetUsernames();
    if (usernames.length === 0) {
      document.getElementById('likeStatus').innerText = 'Gagal mengambil user';
      return;
    }

    for (let i = 0; i < usernames.length && !stopFlag; i++) {
      let result = await likeLatestPost(usernames[i]);
      if (result) success++;
      else fail++;
      updateUI(success, fail, `Memproses ${i + 1}/${usernames.length}`);
      let d = random ? (Math.floor(Math.random() * 5) + 5) * 1000 : delaySec;
      await delay(d);
    }

    document.getElementById('likeStatus').innerText = stopFlag ? 'Dihentikan' : 'Selesai';
  };

  document.getElementById('stopLike').onclick = () => {
    stopFlag = true;
    document.getElementById('likeStatus').innerText = 'Dihentikan';
  };
})();
