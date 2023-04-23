// Helper function for sleeping
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Retry function with exponential backoff
async function retryWithExponentialBackoff(
  func,
  maxRetries = 10,
  initialDelay = 1000,
  exponentialBase = 2,
  jitter = true
) {
  let numRetries = 0;
  let delay = initialDelay;

  while (true) {
    try {
      return await func();
    } catch (error) {
      if (error instanceof Response && error.status === 429) {
        numRetries++;

        if (numRetries > maxRetries) {
          throw new Error(
            `Maximum number of retries (${maxRetries}) exceeded.`
          );
        }

        delay *= exponentialBase * (1 + (jitter ? Math.random() : 0));
        await sleep(delay);
      } else {
        throw error;
      }
    }
  }
}

async function fetchSummary(apiKey, text) {
  const fetchSummaryRequest = async () => {
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
        max_tokens: 500,
        n: 1,
        temperature: 0.5,
      }),
    });

    if (!response.ok) {
      throw response;
    }

    const data = await response.json();
    return data.choices && data.choices.length > 0
      ? data.choices[0].message.content.trim()
      : "No summary generated.";
  };

  return retryWithExponentialBackoff(fetchSummaryRequest);
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
      max_tokens: 500,
      n: 1,
      temperature: 0.5,
    }),
  });

  const data = await response.json();
  return data.choices && data.choices.length > 0
    ? data.choices[0].message.content.trim()
    : "No response generated.";
}

async function fetchEmbeddings(apiKey, text) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type: "fetchEmbeddings", apiKey: apiKey, text: text },
      (response) => {
        if (response.embeddings) {
          resolve(response.embeddings);
        } else {
          console.error("Error fetching embeddings:", response.error);
          reject(new Error(`Error fetching embeddings: ${response.error}`));
        }
      }
    );
  });
}
