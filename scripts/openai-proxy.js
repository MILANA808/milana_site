(function () {
  async function chat(messages, opts = {}) {
    const body = {
      model: opts.model || "gpt-4o-mini",
      messages,
      stream: !!opts.stream
    };
    if (typeof opts.temperature === 'number') {
      body.temperature = opts.temperature;
    }
    if (typeof opts.maxTokens === 'number') {
      body.max_tokens = opts.maxTokens;
    }
    const headers = { "Content-Type": "application/json" };
    // Если в .env прокси задан CLIENT_TOKENS=..., можно добавить:
    // headers["x-client-token"] = "dev-token-123";

    const response = await fetch("http://localhost:8787/v1/chat/completions", {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error("Proxy error " + response.status + ": " + text);
    }

    const data = await response.json();
    return data;
  }

  window.AKSI = window.AKSI || {};
  window.AKSI.chat = chat;
})();
