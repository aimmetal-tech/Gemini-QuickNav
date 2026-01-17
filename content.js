// content.js

// 配置项
const CONFIG = {
    // [关键修改]：不再抓取单行 (.query-text-line)，而是抓取整块消息容器 (.query-text)
    querySelector: '.query-text',
    // 防抖延迟（毫秒）
    debounceDelay: 1000
};

let navPanel = null;
let debounceTimer = null;

// --- 初始化 ---
function initNavigator() {
    if (document.getElementById('gemini-nav-panel')) return;
    createPanelUI();
    createToggleBtn();
    scanMessages();
    startObserver();
}

// --- UI 构建 (保持不变) ---
function createPanelUI() {
    navPanel = document.createElement('div');
    navPanel.id = 'gemini-nav-panel';
    navPanel.innerHTML = `
        <div class="nav-header">
            <span>💬 提问导航</span>
            <div class="nav-controls">
                <button id="refresh-nav" title="刷新列表">↻</button>
                <button id="close-nav" title="关闭面板">×</button>
            </div>
        </div>
        <div id="nav-list"></div>
    `;
    document.body.appendChild(navPanel);

    document.getElementById('refresh-nav').addEventListener('click', () => {
        scanMessages();
        const btn = document.getElementById('refresh-nav');
        btn.style.transform = 'rotate(360deg)';
        setTimeout(() => btn.style.transform = 'none', 500);
    });

    document.getElementById('close-nav').addEventListener('click', () => {
        navPanel.style.display = 'none';
        document.getElementById('gemini-nav-toggle').style.display = 'flex';
    });
}

function createToggleBtn() {
    const btn = document.createElement('button');
    btn.id = 'gemini-nav-toggle';
    btn.innerHTML = '☰';
    btn.title = "显示历史提问";
    btn.onclick = () => {
        navPanel.style.display = 'flex';
        btn.style.display = 'none';
        scanMessages();
    };
    document.body.appendChild(btn);
    btn.style.display = 'none';
}

// --- 核心逻辑：扫描并生成列表 (已修复割裂问题) ---
function scanMessages() {
    const listContainer = document.getElementById('nav-list');
    if (!listContainer) return;

    // 抓取消息容器
    const messages = document.querySelectorAll(CONFIG.querySelector);

    listContainer.innerHTML = '';

    if (messages.length === 0) {
        listContainer.innerHTML = '<div class="nav-empty">暂无提问记录</div>';
        return;
    }

    messages.forEach((msgElement, index) => {
        // 获取整块文本
        let text = msgElement.innerText.trim();
        if (!text) return;

        // [关键修改]：将换行符替换为空格，避免预览时文字断裂
        text = text.replace(/[\r\n]+/g, ' ');

        // 截取预览文本 (前25个字符)
        const displayText = text.length > 25 ? text.substring(0, 25) + '...' : text;

        const item = document.createElement('div');
        item.className = 'nav-item';

        // [安全修复] 使用 DOM API 创建元素，防止 HTML 代码被渲染
        const indexSpan = document.createElement('span');
        indexSpan.className = 'nav-index';
        indexSpan.textContent = index + 1; // 序号

        const textSpan = document.createElement('span');
        textSpan.className = 'nav-text';
        textSpan.textContent = displayText; // 这里使用 textContent，浏览器会把 HTML 标签当作普通文字显示

        // 组装
        item.appendChild(indexSpan);
        item.appendChild(textSpan);

        item.addEventListener('click', () => {
            scrollToMessage(msgElement);
        });

        listContainer.appendChild(item);
    });
}

// --- 滚动与高亮效果 ---
function scrollToMessage(element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // 现在 element 本身就是容器 (.query-text)，直接高亮它即可
    // 为了效果更好，我们可以尝试找它的父级（通常是 user-query-container），如果找不到就高亮它自己
    const targetToHighlight = element.closest('.user-query-container') || element;

    const originalTransition = targetToHighlight.style.transition;
    const originalBg = targetToHighlight.style.backgroundColor;
    const originalTransform = targetToHighlight.style.transform;

    targetToHighlight.style.transition = 'all 0.4s ease';
    targetToHighlight.style.backgroundColor = 'rgba(255, 215, 0, 0.25)';
    targetToHighlight.style.transform = 'scale(1.01)'; // 稍微缩小一点放大比例，避免大段文字晃动太大
    targetToHighlight.style.borderRadius = '8px';

    setTimeout(() => {
        targetToHighlight.style.backgroundColor = originalBg;
        targetToHighlight.style.transform = originalTransform;
        targetToHighlight.style.borderRadius = '';

        setTimeout(() => {
            targetToHighlight.style.transition = originalTransition;
        }, 400);
    }, 1500);
}

// --- 监听器 ---
function startObserver() {
    let lastUrl = location.href;
    const observer = new MutationObserver((mutations) => {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(scanMessages, 1500);
        } else {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(scanMessages, CONFIG.debounceDelay);
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

setTimeout(initNavigator, 2000);