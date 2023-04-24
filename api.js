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

// Fetch a list of multiple summaries from regular completion endpoint using batching
async function fetchSummaries(apiKey, textChunks) {
  const promptArray = textChunks.map(
    (text) => `Summarize the text below:\n\n${text}`
  );

  const fetchSummariesRequest = async () => {
    const response = await fetch("https://api.openai.com/v1/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "text-curie-001",
        prompt: promptArray,
        max_tokens: 500,
        n: 1,
        temperature: 0.5,
      }),
    });

    if (!response.ok) {
      throw response;
    }

    const data = await response.json();
    const summaries = data.choices.map((choice) => choice.text.trim());
    return summaries;
  };

  return retryWithExponentialBackoff(fetchSummariesRequest);
}

// Fetch a single summary from chat completion endpoint
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
            content: `Summarize the text below:\n\n${text}`,
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
  const fetchSummaryRequest = async () => {
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

    if (!response.ok) {
      throw response;
    }

    const data = await response.json();
    return data.choices && data.choices.length > 0
      ? data.choices[0].message.content.trim()
      : "No response generated.";
  };

  return retryWithExponentialBackoff(fetchSummaryRequest);
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
