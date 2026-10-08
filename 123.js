const state = {
    rootHandle: null,
    currentDirectoryHandle: null,
    currentFileHandle: null,
    currentFileName: "",
    currentPath: "",
    dialogMode: null
  };
  
  /* =========================
     ELEMENTS
  ========================= */
  
  const startScreen = document.getElementById("start");
  const ide = document.getElementById("ide");
  const tree = document.getElementById("tree");
  const editor = document.getElementById("editor");
  const tabs = document.getElementById("tabs");
  const output = document.getElementById("output");
  const projectName = document.getElementById("projectName");
  const language = document.getElementById("language");
  const cursorInfo = document.getElementById("cursorInfo");
  const lineNumbers = document.getElementById("lineNumbers");
  
  const modalBg = document.getElementById("modalBg");
  const modalTitle = document.getElementById("modalTitle");
  const modalText = document.getElementById("modalText");
  const modalInput = document.getElementById("modalInput");
  const modalPrimary = document.getElementById("modalPrimary");
  
  /* =========================
     TOAST
  ========================= */
  
  let toastTimer;
  
  function showToast(message, type = "success") {
    let toast = document.getElementById("toast");
  
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "toast";
      document.body.appendChild(toast);
    }
  
    toast.textContent = message;
  
    toast.style.opacity = "1";
    toast.style.transform = "translateY(0)";
    toast.style.borderColor =
      type === "error" ? "#633043" : "#2b5547";
  
    clearTimeout(toastTimer);
  
    toastTimer = setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(12px)";
    }, 2500);
  }
  
  /* =========================
     OUTPUT
  ========================= */
  
  function log(message, type = "info") {
    if (!output) return;
  
    const line = document.createElement("div");
    line.className = type;
    line.textContent = message;
  
    output.appendChild(line);
    output.scrollTop = output.scrollHeight;
  }
  
  function clearOutput() {
    if (output) {
      output.innerHTML = "";
    }
  }
  
  /* =========================
     SHOW IDE
  ========================= */
  
  function showIDE() {
    if (startScreen) {
      startScreen.style.display = "none";
    }
  
    if (ide) {
      ide.style.display = "block";
    }
  }
  
  /* =========================
     OPEN PROJECT FOLDER
  ========================= */
  
  async function openProjectFolder() {
    if (!("showDirectoryPicker" in window)) {
      showToast(
        "Chrome ё Edge-и нав истифода бар.",
        "error"
      );
      return;
    }
  
    try {
      const handle =
        await window.showDirectoryPicker({
          mode: "readwrite"
        });
  
      state.rootHandle = handle;
      state.currentDirectoryHandle = handle;
      state.currentFileHandle = null;
      state.currentFileName = "";
      state.currentPath = "";
  
      projectName.textContent = handle.name;
  
      editor.value = "";
      tabs.innerHTML = "";
  
      showIDE();
  
      await refreshExplorer();
  
      showToast(`✓ ${handle.name} opened`);
      log(
        `Project opened: ${handle.name}`,
        "ok"
      );
  
    } catch (error) {
      if (error.name !== "AbortError") {
        console.error(error);
  
        showToast(
          "Папка кушода нашуд.",
          "error"
        );
      }
    }
  }
  
  /* =========================
     EXPLORER
  ========================= */
  
  async function refreshExplorer() {
    tree.innerHTML = "";
  
    if (!state.rootHandle) {
      tree.innerHTML = `
        <div class="empty">
          Open a project folder
        </div>
      `;
      return;
    }
  
    await renderDirectory(
      state.rootHandle,
      tree,
      0
    );
  }
  
  async function renderDirectory(
    directoryHandle,
    container,
    depth
  ) {
    const entries = [];
  
    for await (
      const entry of directoryHandle.values()
    ) {
      entries.push(entry);
    }
  
    entries.sort((a, b) => {
      if (a.kind !== b.kind) {
        return a.kind === "directory"
          ? -1
          : 1;
      }
  
      return a.name.localeCompare(
        b.name
      );
    });
  
    for (const entry of entries) {
      const row =
        document.createElement("div");
  
      row.className = "file";
  
      row.dataset.name =
        entry.name.toLowerCase();
  
      row.style.paddingLeft =
        `${9 + depth * 16}px`;
  
      /* FOLDER */
  
      if (entry.kind === "directory") {
        row.classList.add(
          "folder-item"
        );
  
        row.innerHTML = `
          <span>📁</span>
          <span>
            ${escapeHTML(entry.name)}
          </span>
        `;
  
        const children =
          document.createElement("div");
  
        children.style.display = "none";
  
        container.appendChild(row);
        container.appendChild(children);
  
        let loaded = false;
  
        row.addEventListener(
          "click",
          async () => {
            state.currentDirectoryHandle =
              entry;
  
            const opened =
              children.style.display !==
              "none";
  
            children.style.display =
              opened
                ? "none"
                : "block";
  
            row.children[0].textContent =
              opened
                ? "📁"
                : "📂";
  
            if (!opened && !loaded) {
              loaded = true;
  
              await renderDirectory(
                entry,
                children,
                depth + 1
              );
            }
          }
        );
  
        continue;
      }
  
      /* FILE */
  
      const icon =
        getFileIcon(entry.name);
  
      row.innerHTML = `
        <span class="${icon.className}">
          ${icon.icon}
        </span>
  
        <span>
          ${escapeHTML(entry.name)}
        </span>
      `;
  
      container.appendChild(row);
  
      row.addEventListener(
        "click",
        async () => {
          await openRealFile(
            entry,
            row
          );
        }
      );
    }
  }
  
  /* =========================
     SEARCH
  ========================= */
  
  function filterFiles() {
    const input =
      document.getElementById(
        "fileSearch"
      );
  
    if (!input) return;
  
    const query =
      input.value
        .toLowerCase()
        .trim();
  
    document
      .querySelectorAll(
        "#tree .file"
      )
      .forEach(item => {
        const name =
          item.dataset.name || "";
  
        item.style.display =
          !query ||
          name.includes(query)
            ? ""
            : "none";
      });
  }
  
  /* =========================
     FILE ICON
  ========================= */
  
  function getFileIcon(name) {
    const ext =
      name.includes(".")
        ? name
            .split(".")
            .pop()
            .toLowerCase()
        : "";
  
    if (ext === "html") {
      return {
        icon: "◉",
        className: "html"
      };
    }
  
    if (ext === "css") {
      return {
        icon: "◈",
        className: "css"
      };
    }
  
    if (ext === "js") {
      return {
        icon: "◆",
        className: "js"
      };
    }
  
    if (ext === "json") {
      return {
        icon: "{}",
        className: "json"
      };
    }
  
    return {
      icon: "📄",
      className: ""
    };
  }
  
  /* =========================
     OPEN FILE
  ========================= */
  
  async function openRealFile(
    fileHandle,
    row
  ) {
    try {
      const file =
        await fileHandle.getFile();
  
      const content =
        await file.text();
  
      state.currentFileHandle =
        fileHandle;
  
      state.currentFileName =
        fileHandle.name;
  
      state.currentPath =
        fileHandle.name;
  
      editor.value = content;
  
      document
        .querySelectorAll(".file")
        .forEach(item => {
          item.classList.remove(
            "active"
          );
        });
  
      row.classList.add("active");
  
      renderTab(
        fileHandle.name
      );
  
      updateLanguage(
        fileHandle.name
      );
  
      updateLineNumbers();
      updateCursor();
  
      showToast(
        `✓ ${fileHandle.name}`
      );
  
    } catch (error) {
      console.error(error);
  
      showToast(
        "Файл кушода нашуд.",
        "error"
      );
    }
  }
  
  /* =========================
     SAVE
  ========================= */
  
  async function saveCurrentFile() {
    if (!state.currentFileHandle) {
      showToast(
        "Аввал файлро интихоб кун.",
        "error"
      );
      return;
    }
  
    try {
      const writable =
        await state.currentFileHandle
          .createWritable();
  
      await writable.write(
        editor.value
      );
  
      await writable.close();
  
      showToast(
        `✓ ${state.currentFileName} saved`
      );
  
      log(
        `Saved: ${state.currentFileName}`,
        "ok"
      );
  
    } catch (error) {
      console.error(error);
  
      showToast(
        "Файл нигоҳ дошта нашуд.",
        "error"
      );
    }
  }
  
  /* =========================
     NEW FILE
  ========================= */
  
  function openNewFileDialog() {
    if (!state.rootHandle) {
      showToast(
        "Аввал Project Folder-ро интихоб кун.",
        "error"
      );
      return;
    }
  
    state.dialogMode = "file";
  
    modalTitle.textContent =
      "New File";
  
    modalText.textContent =
      "Номи файли навро навис.";
  
    modalInput.value = "";
    modalInput.placeholder =
      "app.js";
  
    modalPrimary.textContent =
      "Create";
  
    modalBg.classList.add("show");
  
    modalInput.classList.remove(
      "hidden"
    );
  
    modalPrimary.classList.remove(
      "hidden"
    );
  
    modalInput.focus();
  }
  
  /* =========================
     NEW FOLDER
  ========================= */
  
  function openNewFolderDialog() {
    if (!state.rootHandle) {
      showToast(
        "Аввал Project Folder-ро интихоб кун.",
        "error"
      );
      return;
    }
  
    state.dialogMode = "folder";
  
    modalTitle.textContent =
      "New Folder";
  
    modalText.textContent =
      "Номи папкаи навро навис.";
  
    modalInput.value = "";
    modalInput.placeholder =
      "src";
  
    modalPrimary.textContent =
      "Create";
  
    modalBg.classList.add("show");
  
    modalInput.classList.remove(
      "hidden"
    );
  
    modalPrimary.classList.remove(
      "hidden"
    );
  
    modalInput.focus();
  }
  
  /* =========================
     CREATE FILE
  ========================= */
  
  async function createNewFile(
    name
  ) {
    try {
      const parent =
        state.currentDirectoryHandle ||
        state.rootHandle;
  
      const fileHandle =
        await parent.getFileHandle(
          name,
          {
            create: true
          }
        );
  
      const writable =
        await fileHandle
          .createWritable();
  
      await writable.write("");
  
      await writable.close();
  
      state.currentFileHandle =
        fileHandle;
  
      state.currentFileName =
        name;
  
      editor.value = "";
  
      renderTab(name);
      updateLanguage(name);
      updateLineNumbers();
      updateCursor();
  
      await refreshExplorer();
  
      showToast(
        `✓ ${name} created`
      );
  
    } catch (error) {
      console.error(error);
  
      showToast(
        "Файл сохта нашуд.",
        "error"
      );
    }
  }
  
  /* =========================
     CREATE FOLDER
  ========================= */
  
  async function createNewFolder(
    name
  ) {
    try {
      const parent =
        state.currentDirectoryHandle ||
        state.rootHandle;
  
      await parent.getDirectoryHandle(
        name,
        {
          create: true
        }
      );
  
      await refreshExplorer();
  
      showToast(
        `✓ ${name} created`
      );
  
    } catch (error) {
      console.error(error);
  
      showToast(
        "Папка сохта нашуд.",
        "error"
      );
    }
  }
  
  /* =========================
     MODAL SUBMIT
  ========================= */
  
  async function submitModal() {
    const value =
      modalInput.value.trim();
  
    if (!value) {
      showToast(
        "Номро навис.",
        "error"
      );
      return;
    }
  
    if (
      state.dialogMode ===
      "file"
    ) {
      await createNewFile(value);
      closeModal();
      return;
    }
  
    if (
      state.dialogMode ===
      "folder"
    ) {
      await createNewFolder(value);
      closeModal();
      return;
    }
  
    if (
      state.dialogMode ===
      "github"
    ) {
      closeModal();
      await connectGithub(value);
    }
  }
  
  /* =========================
     TAB
  ========================= */
  
  function renderTab(name) {
    tabs.innerHTML = "";
  
    const tab =
      document.createElement("div");
  
    tab.className =
      "tab active";
  
    const icon =
      getFileIcon(name);
  
    tab.innerHTML = `
      <span class="${icon.className}">
        ${icon.icon}
      </span>
  
      <span>
        ${escapeHTML(name)}
      </span>
    `;
  
    tabs.appendChild(tab);
  }
  
  /* =========================
     LANGUAGE
  ========================= */
  
  function updateLanguage(name) {
    const ext =
      name.includes(".")
        ? name
            .split(".")
            .pop()
            .toLowerCase()
        : "";
  
    language.textContent =
      ext === "html"
        ? "HTML"
        : ext === "css"
        ? "CSS"
        : ext === "js"
        ? "JavaScript"
        : ext === "json"
        ? "JSON"
        : "TEXT";
  }
  
  /* =========================
     LINE NUMBERS
  ========================= */
  
  function updateLineNumbers() {
    const count =
      Math.max(
        1,
        editor.value.split("\n")
          .length
      );
  
    lineNumbers.innerHTML =
      Array.from(
        {
          length: count
        },
        (_, i) => i + 1
      ).join("<br>");
  }
  
  /* =========================
     CURSOR
  ========================= */
  
  function updateCursor() {
    const text =
      editor.value.substring(
        0,
        editor.selectionStart
      );
  
    const lines =
      text.split("\n");
  
    cursorInfo.textContent =
      `Ln ${lines.length}, Col ${
        lines[lines.length - 1]
          .length + 1
      }`;
  }
  
  /* =========================
     EDITOR
  ========================= */
  
  editor.addEventListener(
    "input",
    () => {
      updateLineNumbers();
      updateCursor();
    }
  );
  
  editor.addEventListener(
    "keyup",
    updateCursor
  );
  
  editor.addEventListener(
    "click",
    updateCursor
  );
  
  editor.addEventListener(
    "scroll",
    () => {
      lineNumbers.scrollTop =
        editor.scrollTop;
    }
  );
  
  editor.addEventListener(
    "keydown",
    event => {
  
      if (event.key === "Tab") {
        event.preventDefault();
  
        const start =
          editor.selectionStart;
  
        const end =
          editor.selectionEnd;
  
        editor.value =
          editor.value.substring(
            0,
            start
          ) +
          "  " +
          editor.value.substring(end);
  
        editor.selectionStart =
          editor.selectionEnd =
            start + 2;
  
        updateLineNumbers();
        updateCursor();
      }
  
      if (
        (event.ctrlKey ||
          event.metaKey) &&
        event.key.toLowerCase() === "s"
      ) {
        event.preventDefault();
  
        saveCurrentFile();
      }
  
      if (
        event.ctrlKey &&
        event.key === "Enter"
      ) {
        event.preventDefault();
  
        previewProject();
      }
    }
  );
  
  /* =========================
     RUN
  ========================= */
  
  async function previewProject() {
    const code =
      editor.value.trim();
  
    if (!code) {
      showToast(
        "Аввал код навис.",
        "error"
      );
  
      return;
    }
  
    try {
      /*
        Кодро дар Blob месозем.
        Ин ҳама гуна HTML/CSS/JS-ро
        иҷро мекунад.
      */
  
      const blob =
        new Blob(
          [editor.value],
          {
            type: "text/html"
          }
        );
  
      const url =
        URL.createObjectURL(blob);
  
      const win =
        window.open(
          url,
          "_blank"
        );
  
      if (!win) {
        showToast(
          "Popup-и браузер баста шудааст.",
          "error"
        );
  
        URL.revokeObjectURL(url);
  
        return;
      }
  
      log(
        "✓ Project running...",
        "ok"
      );
  
      showToast(
        "✓ Run"
      );
  
      setTimeout(() => {
        URL.revokeObjectURL(
          url
        );
      }, 60000);
  
    } catch (error) {
      console.error(error);
  
      showToast(
        "Run кор карда натавонист.",
        "error"
      );
    }
  }
  
  /* =========================
     AI
  ========================= */
  
  function toggleAI() {
    const panel =
      document.getElementById(
        "aiPanel"
      );
  
    panel.classList.toggle(
      "show"
    );
  
    if (
      panel.classList.contains(
        "show"
      )
    ) {
      document
        .getElementById(
          "aiInput"
        )
        .focus();
    }
  }
  
  function addAIMessage(
    text,
    type
  ) {
    const chat =
      document.getElementById(
        "aiChat"
      );
  
    const message =
      document.createElement(
        "div"
      );
  
    message.className =
      `ai-message ${type}`;
  
    message.textContent =
      text;
  
    chat.appendChild(
      message
    );
  
    chat.scrollTop =
      chat.scrollHeight;
  }
  
  async function sendAI() {
    const input =
      document.getElementById(
        "aiInput"
      );
  
    const text =
      input.value.trim();
  
    if (!text) {
      return;
    }
  
    addAIMessage(
      text,
      "user"
    );
  
    input.value = "";
  
    const chat =
      document.getElementById(
        "aiChat"
      );
  
    const loading =
      document.createElement(
        "div"
      );
  
    loading.className =
      "ai-message bot";
  
    loading.textContent =
      "AI фикр карда истодааст...";
  
    chat.appendChild(
      loading
    );
  
    chat.scrollTop =
      chat.scrollHeight;
  
    try {
      const response =
        await fetch(
          "/api/ai",
          {
            method: "POST",
  
            headers: {
              "Content-Type":
                "application/json"
            },
  
            body:
              JSON.stringify({
                message: text,
  
                code:
                  state.currentFileHandle
                    ? editor.value
                    : "",
  
                file:
                  state.currentFileName ||
                  ""
              })
          }
        );
  
      const data =
        await response.json();
  
      loading.remove();
  
      addAIMessage(
        data.reply ||
          "AI ҷавоб надод.",
        "bot"
      );
  
    } catch (error) {
      console.error(error);
  
      loading.remove();
  
      addAIMessage(
        "Ҳоло ҷавоб гирифтан имкон нашуд.",
        "bot"
      );
    }
  }
  
  /* =========================
     AI ENTER
  ========================= */
  
  const aiInput =
    document.getElementById(
      "aiInput"
    );
  
  if (aiInput) {
    aiInput.addEventListener(
      "keydown",
      event => {
  
        if (
          event.key === "Enter" &&
          !event.shiftKey
        ) {
          event.preventDefault();
  
          sendAI();
        }
      }
    );
  }
  
  /* =========================
     PAYMENT
  ========================= */
  
  function openPayment() {
    const paymentBg =
      document.getElementById(
        "paymentBg"
      );
  
    paymentBg.classList.add(
      "show"
    );
  }
  
  function closePayment() {
    const paymentBg =
      document.getElementById(
        "paymentBg"
      );
  
    paymentBg.classList.remove(
      "show"
    );
  }
  
  function fakePayment() {
    closePayment();
  
    showToast(
      "Системаи пардохт ҳоло пайваст нашудааст.",
      "error"
    );
  }
  
  /* =========================
     GITHUB
  ========================= */
  
  function openGithubModal() {
    state.dialogMode =
      "github";
  
    modalTitle.textContent =
      "Clone GitHub";
  
    modalText.textContent =
      "Public GitHub repository URL-ро ворид кун.";
  
    modalInput.value = "";
  
    modalInput.placeholder =
      "https://github.com/user/repository";
  
    modalPrimary.textContent =
      "Open";
  
    modalInput.classList.remove(
      "hidden"
    );
  
    modalPrimary.classList.remove(
      "hidden"
    );
  
    modalBg.classList.add(
      "show"
    );
  
    modalInput.focus();
  }
  
  async function connectGithub(url) {
    const match =
      url.match(
        /^https?:\/\/github\.com\/([^/]+)\/([^/#?]+)/
      );
  
    if (!match) {
      showToast(
        "GitHub URL нодуруст аст.",
        "error"
      );
      return;
    }
  
    const owner =
      match[1];
  
    const repo =
      match[2].replace(
        /\.git$/,
        ""
      );
  
    try {
      const response =
        await fetch(
          `https://api.github.com/repos/${owner}/${repo}`
        );
  
      if (!response.ok) {
        throw new Error(
          "Repository not found"
        );
      }
  
      const info =
        await response.json();
  
      showIDE();
  
      projectName.textContent =
        `${owner}/${repo}`;
  
      showToast(
        `✓ ${owner}/${repo} connected`
      );
  
      log(
        `Branch: ${info.default_branch}`,
        "info"
      );
  
    } catch (error) {
      console.error(error);
  
      showToast(
        "GitHub connection failed.",
        "error"
      );
    }
  }
  
  /* =========================
     SSH
  ========================= */
  
  function showSSHInfo() {
    state.dialogMode =
      "ssh";
  
    modalTitle.textContent =
      "Connect via SSH";
  
    modalText.textContent =
      "SSH-и воқеӣ дар браузери оддӣ иҷро намешавад.";
  
    modalInput.classList.add(
      "hidden"
    );
  
    modalPrimary.classList.add(
      "hidden"
    );
  
    modalBg.classList.add(
      "show"
    );
  }
  
  /* =========================
     MODAL
  ========================= */
  
  function closeModal() {
    modalBg.classList.remove(
      "show"
    );
  
    modalInput.classList.remove(
      "hidden"
    );
  
    modalPrimary.classList.remove(
      "hidden"
    );
  
    state.dialogMode = null;
  }
  
  modalBg.addEventListener(
    "click",
    event => {
  
      if (
        event.target ===
        modalBg
      ) {
        closeModal();
      }
  
    }
  );
  
  modalInput.addEventListener(
    "keydown",
    event => {
  
      if (event.key === "Enter") {
        event.preventDefault();
  
        submitModal();
      }
  
      if (event.key === "Escape") {
        closeModal();
      }
  
    }
  );
  
  /* =========================
     ESCAPE HTML
  ========================= */
  
  function escapeHTML(value) {
    return String(value)
      .replaceAll(
        "&",
        "&amp;"
      )
      .replaceAll(
        "<",
        "&lt;"
      )
      .replaceAll(
        ">",
        "&gt;"
      )
      .replaceAll(
        '"',
        "&quot;"
      )
      .replaceAll(
        "'",
        "&#039;"
      );
  }
  
  /* =========================
     START
  ========================= */
  
  log(
    "CodeNova is ready.",
    "info"
  );
  
  log(
    "Open a project folder to begin.",
    "info"
  );
  
  updateLineNumbers();
  updateCursor();/* =========================
  FIRST ENTRY + 20 MIN TIMER
========================= */

let trialSeconds = 20 * 60;
let trialInterval = null;

function startTrialTimer() {
 const savedStart = localStorage.getItem(
   "codenova_trial_start"
 );

 if (savedStart) {
   const elapsed = Math.floor(
     (Date.now() - Number(savedStart)) / 1000
   );

   trialSeconds = Math.max(
     0,
     20 * 60 - elapsed
   );
 } else {
   localStorage.setItem(
     "codenova_trial_start",
     Date.now()
   );

   trialSeconds = 20 * 60;
 }

 updateTrialTimer();

 clearInterval(trialInterval);

 trialInterval = setInterval(() => {
   trialSeconds--;

   updateTrialTimer();

   if (trialSeconds <= 0) {
     clearInterval(trialInterval);

     openSubscription();

     showToast(
       "20 дақиқаи ройгон тамом шуд.",
       "error"
     );
   }
 }, 1000);
}

function updateTrialTimer() {
 const timer =
   document.getElementById("trialTimer");

 if (!timer) return;

 const minutes = Math.floor(
   trialSeconds / 60
 );

 const seconds = trialSeconds % 60;

 timer.textContent =
   `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function openSubscription() {
 const box =
   document.getElementById("subscriptionBg");

 if (box) {
   box.classList.add("show");
 }
}

function closeSubscription() {
 const box =
   document.getElementById("subscriptionBg");

 if (box) {
   box.classList.remove("show");
 }
}

window.addEventListener("load", () => {
 const subscription =
   localStorage.getItem(
     "codenova_subscription"
   );

 /* Агар обуна надошта бошад,
    ҳангоми даромадан payment кушода мешавад */
 if (!subscription) {
   openSubscription();
 }

 startTrialTimer();
});