// api.js
async function fetchSummary(apiKey, text) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "user",
          content: `Please provide a TLDR of the following text. Keep it super short and barebones, removing any extraneous information. Write in abbreviated style, no extra words:\n\n${text}`,
        },
      ],
      max_tokens: 1000,
      n: 1,
      temperature: 0.5,
    }),
  });

  const data = await response.json();
  return data.choices && data.choices.length > 0
    ? data.choices[0].message.content.trim()
    : "No summary generated.";
}

async function fetchSummaryWithMessageHistory(apiKey, messageHistory) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: messageHistory,
      max_tokens: 1000,
      n: 1,
      temperature: 0.5,
    }),
  });

  const data = await response.json();
  return data.choices && data.choices.length > 0
    ? data.choices[0].message.content.trim()
    : "No response generated.";
}
