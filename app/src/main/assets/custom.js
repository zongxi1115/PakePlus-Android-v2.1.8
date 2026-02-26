window.addEventListener("DOMContentLoaded",()=>{const t=document.createElement("script");t.src="https://www.googletagmanager.com/gtag/js?id=G-W5GKHM0893",t.async=!0,document.head.appendChild(t);const n=document.createElement("script");n.textContent="window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', 'G-W5GKHM0893');",document.body.appendChild(n)});// very important, if you don't know what it is, don't touch it
// 非常重要，不懂代码不要动，这里可以解决80%的问题，也可以生产1000+的bug
const hookClick = (e) => {
    const origin = e.target.closest('a')
    const isBaseTargetBlank = document.querySelector(
        'head base[target="_blank"]'
    )
    console.log('origin', origin, isBaseTargetBlank)
    if (
        (origin && origin.href && origin.target === '_blank') ||
        (origin && origin.href && isBaseTargetBlank)
    ) {
        e.preventDefault()
        console.log('handle origin', origin)
        location.href = origin.href
    } else {
        console.log('not handle origin', origin)
    }
}

window.open = function (url, target, features) {
    console.log('open', url, target, features)
    location.href = url
}

document.addEventListener('click', hookClick, { capture: true })

// intranet-check.js
(() => {
  // ===== 你只需要改这里 =====
  const CHECK_URL = "http://ybsz.yzu.edu.cn/"; // 推荐同域；如果没有就换成 "/api/ping" 或者 "http://intranet.xxx.local/ping"
  const TIMEOUT_MS = 2500;     // 超时就认为不在内网
  const RETRY_INTERVAL_MS = 0; // 0=不自动重试；比如 5000 可每 5 秒自动重试
  // ==========================

  const state = {
    overlayEl: null,
    timer: null,
    checking: false,
  };

  function injectStyles() {
    if (document.getElementById("__pake_intranet_styles__")) return;
    const style = document.createElement("style");
    style.id = "__pake_intranet_styles__";
    style.textContent = `
      :root { color-scheme: light dark; }
      .__pake_overlay__{
        position:fixed; inset:0; z-index:2147483647;
        display:flex; align-items:center; justify-content:center;
        padding:24px;
        background: rgba(10, 12, 16, .58);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
      }
      .__pake_card__{
        width:min(520px, 100%);
        border-radius: 20px;
        padding: 22px 20px 18px;
        background: rgba(255,255,255,.92);
        color: #0b1220;
        box-shadow: 0 18px 60px rgba(0,0,0,.28);
        border: 1px solid rgba(255,255,255,.65);
      }
      @media (prefers-color-scheme: dark){
        .__pake_card__{
          background: rgba(18,22,30,.88);
          color: #e9eef8;
          border: 1px solid rgba(255,255,255,.10);
        }
        .__pake_sub__{ color: rgba(233,238,248,.70); }
        .__pake_hint__{ color: rgba(233,238,248,.62); }
        .__pake_btn__{ background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.12); color:#e9eef8; }
        .__pake_btn_primary__{ background: #3b82f6; border-color:#3b82f6; color:white; }
      }
      .__pake_head__{ display:flex; align-items:center; gap:12px; margin-bottom: 12px; }
      .__pake_icon__{
        width:40px; height:40px; border-radius: 12px;
        display:grid; place-items:center;
        background: linear-gradient(135deg, rgba(59,130,246,.18), rgba(59,130,246,.08));
        border: 1px solid rgba(59,130,246,.18);
      }
      .__pake_title__{ font-size: 18px; font-weight: 800; letter-spacing: .2px; }
      .__pake_sub__{ margin: 8px 0 12px; font-size: 13px; line-height: 1.55; color: rgba(11,18,32,.70); }
      .__pake_hint__{
        margin: 0 0 16px;
        font-size: 12px; line-height: 1.6;
        color: rgba(11,18,32,.62);
        padding: 10px 12px;
        border-radius: 14px;
        background: rgba(59,130,246,.08);
        border: 1px solid rgba(59,130,246,.14);
      }
      .__pake_actions__{ display:flex; gap:10px; justify-content:flex-end; flex-wrap:wrap; }
      .__pake_btn__{
        appearance:none; -webkit-appearance:none;
        border-radius: 14px;
        padding: 10px 14px;
        font-size: 13px; font-weight: 650;
        border: 1px solid rgba(0,0,0,.08);
        background: rgba(255,255,255,.72);
        color: #0b1220;
        cursor: pointer;
        transition: transform .06s ease, filter .12s ease;
        user-select: none;
      }
      .__pake_btn__:active{ transform: scale(.98); }
      .__pake_btn__:disabled{ opacity:.65; cursor:not-allowed; }
      .__pake_btn_primary__{
        background: #2563eb;
        border-color: #2563eb;
        color: white;
      }
      .__pake_status__{
        margin-top: 10px;
        font-size: 12px;
        color: rgba(11,18,32,.62);
      }
      @media (prefers-color-scheme: dark){
        .__pake_status__{ color: rgba(233,238,248,.58); }
      }
    `;
    document.head.appendChild(style);
  }

  function createOverlay() {
    injectStyles();
    const overlay = document.createElement("div");
    overlay.className = "__pake_overlay__";
    overlay.innerHTML = `
      <div class="__pake_card__" role="dialog" aria-modal="true" aria-label="网络环境检测失败">
        <div class="__pake_head__">
          <div class="__pake_icon__" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 9v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <path d="M12 17h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
              <path d="M10.29 3.86l-8.4 14.56A2 2 0 0 0 3.61 21h16.78a2 2 0 0 0 1.72-2.58L13.71 3.86a2 2 0 0 0-3.42 0Z"
                stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
            </svg>
          </div>
          <div>
            <div class="__pake_title__">无法访问内网环境</div>
            <div class="__pake_sub__">
              当前网络似乎不在公司/内网（或 VPN 未连接），因此页面无法打开。
            </div>
          </div>
        </div>

        <div class="__pake_hint__">
          你可以尝试：连接公司 Wi-Fi / 打开 VPN / 切换网络后点击「重试」。
          <br/>（检测地址：<code style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;">${escapeHtml(
            CHECK_URL
          )}</code>）
        </div>

        <div class="__pake_actions__">
          <button class="__pake_btn__" id="__pake_reload__">刷新页面</button>
          <button class="__pake_btn__ __pake_btn_primary__" id="__pake_retry__">重试检测</button>
        </div>
        <div class="__pake_status__" id="__pake_status__">等待重试…</div>
      </div>
    `;
    overlay.querySelector("#__pake_reload__").addEventListener("click", () => location.reload());
    overlay.querySelector("#__pake_retry__").addEventListener("click", () => checkNow(true));
    return overlay;
  }

  function showOverlay(statusText) {
    if (!state.overlayEl) {
      state.overlayEl = createOverlay();
      document.documentElement.appendChild(state.overlayEl);
    }
    setStatus(statusText || "检测失败：不在内网 / 无法访问内网站点");
  }

  function hideOverlay() {
    if (state.overlayEl) {
      state.overlayEl.remove();
      state.overlayEl = null;
    }
  }

  function setStatus(text) {
    const el = state.overlayEl?.querySelector("#__pake_status__");
    if (el) el.textContent = text;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  async function probe(url, timeoutMs) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);

    try {
      // 说明：
      // - mode:'no-cors' 在某些跨域场景能“发出请求但拿不到内容”，会导致永远 ok 不准；因此这里保持默认。
      // - same-origin 的 /health 最可靠（不会被 CORS 卡住）
      const res = await fetch(url, {
        method: "GET",
        cache: "no-store",
        signal: ctrl.signal,
        credentials: "include",
      });

      // 如果是跨域且被 CORS 拦了，可能直接 throw；能走到这里通常说明连得通
      if (res && typeof res.status === "number") {
        // 200-399 认为成功；401/403 也可能是“内网通但没登录”，一般仍然算“在内网”
        if ((res.status >= 200 && res.status < 400) || res.status === 401 || res.status === 403) return true;
        return false;
      }
      return true;
    } catch (e) {
      return false;
    } finally {
      clearTimeout(t);
    }
  }

  async function checkNow(fromUserClick = false) {
    if (state.checking) return;
    state.checking = true;

    if (fromUserClick) setStatus("正在重新检测网络环境…");

    const ok = await probe(CHECK_URL, TIMEOUT_MS);

    state.checking = false;

    if (ok) {
      hideOverlay();
      // 可选：成功后提示一下（不想要就删掉）
      // console.log("[intranet-check] OK");
    } else {
      showOverlay("检测失败：请连接内网或开启 VPN，然后重试。");
      if (RETRY_INTERVAL_MS > 0) {
        clearTimeout(state.timer);
        state.timer = setTimeout(() => checkNow(false), RETRY_INTERVAL_MS);
      }
    }
  }

  function boot() {
    // 页面刚加载就检测一次
    checkNow(false);

    // 网络状态变化时也检测
    window.addEventListener("online", () => checkNow(false));
    window.addEventListener("offline", () => showOverlay("当前设备离线：请检查网络后重试。"));

    // 可选：如果你希望页面“永远挡住直到检测通过”，可以在启动时先 showOverlay 再检测
    // showOverlay("正在检测内网环境…");
    // checkNow(false);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
