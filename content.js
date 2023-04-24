try {
  chrome.runtime.sendMessage({ text: "content_script_loaded" });
} catch (error) {
  console.error("Error sending content_script_loaded message:", error.message);
}

function showModal(totalChunks) {
  const modal = document.createElement("div");
  modal.id = "tldrModal";
  modal.style.position = "fixed";
  modal.style.top = "60px";
  modal.style.left = "50%";
  modal.style.transform = "translate(-50%, -50%)";
  modal.style.padding = "20px";
  modal.style.borderRadius = "5px";
  modal.style.backgroundColor = "white";
  modal.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";
  modal.style.zIndex = "10000";
  modal.style.color = "black";
  modal.innerHTML = `
    <p>Generating TLDR...</p>
    <progress id="tldrProgress" value="0" max="${totalChunks}" style="width: 100%;"></progress>
  `;
  document.body.appendChild(modal);
}

function updateProgressBar(value) {
  const progressBar = document.getElementById("tldrProgress");
  if (progressBar) {
    progressBar.value = value;
  }
}

function hideModal() {
  const modal = document.getElementById("tldrModal");
  if (modal) {
    modal.remove();
  }
}

function showSummaryModal(summary, apiKey, messageHistory) {
  const modal = document.createElement("div");
  modal.id = "tldrSummaryModal";
  modal.style.position = "fixed";
  modal.style.top = "50%";
  modal.style.left = "50%";
  modal.style.transform = "translate(-50%, -50%)";
  modal.style.padding = "20px";
  modal.style.borderRadius = "5px";
  modal.style.backgroundColor = "white";
  modal.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";
  modal.style.zIndex = "10000";
  modal.style.fontSize = "12px";
  modal.style.color = "black";

  // Add a response container, input field, and submit button for user questions
  modal.innerHTML = `
    <h2>TLDR Summary</h2>
    <div id="tldrResponses" style="max-height: 400px; overflow-y: scroll; padding-bottom: 10px;">
      <div class="assistant-message" style="background-color: #e0f7fa; padding: 8px; border-radius: 12px; margin-bottom: 8px;">${summary}</div>
    </div>
    <div style="display: flex;">
      <label for="tldrQuestion">Ask a question:</label>
      <input id="tldrQuestion" type="text" placeholder="Enter your question..." style="flex-grow: 1; margin-left: 10px;"/>
      <button id="tldrSubmitQuestion" style="margin-left: 10px;">Submit</button>
    </div>
    <button id="tldrCloseButton" style="display: block; margin: 10px auto;">Close</button>
  `;

  document.body.appendChild(modal);

  const closeButton = document.getElementById("tldrCloseButton");
  closeButton.addEventListener("click", () => {
    modal.remove();
  });

  const questionInput = document.getElementById("tldrQuestion");
  const submitQuestionButton = document.getElementById("tldrSubmitQuestion");
  const responsesContainer = document.getElementById("tldrResponses");

  submitQuestionButton.addEventListener("click", async () => {
    const question = questionInput.value.trim();
    if (question) {
      // Update the message history with the user's question
      messageHistory.push({ role: "user", content: question });

      // Show the user's question in the modal
      const userQuestionElement = document.createElement("div");
      userQuestionElement.style.backgroundColor = "#e1bee7";
      userQuestionElement.style.padding = "8px";
      userQuestionElement.style.borderRadius = "12px";
      userQuestionElement.style.marginBottom = "8px";
      userQuestionElement.textContent = `${question}`;
      userQuestionElement.style.color = "black";
      responsesContainer.appendChild(userQuestionElement);

      // Show an animated "..." in the answer bubble while waiting for the response
      const responseElement = document.createElement("div");
      responseElement.style.backgroundColor = "#e0f7fa";
      responseElement.style.padding = "8px";
      responseElement.style.borderRadius = "12px";
      responseElement.style.marginBottom = "8px";
      responseElement.style.color = "black";
      responseElement.innerHTML = "<span>.</span><span>.</span><span>.</span>";
      responsesContainer.appendChild(responseElement);

      // remove the question from the input field
      questionInput.value = "";

      // Animate the "..." while waiting for the response
      let dots = 1;
      const animateDots = setInterval(() => {
        dots = (dots + 1) % 4;
        const dotsString = ".".repeat(dots);
        responseElement.innerHTML = `<span>${dotsString}</span>`;
      }, 500);

      // Call the API with the updated message history
      const response = await fetchSummaryWithMessageHistory(
        apiKey,
        messageHistory
      );

      // Update the message history with the AI's response
      messageHistory.push({ role: "assistant", content: response });

      // Replace the animated "..." with the actual answer
      clearInterval(animateDots);
      responseElement.textContent = `${response}`;

      // Clear the question input field
      questionInput.value = "";

      // Scroll to the bottom of the responses container
      responsesContainer.scrollTop = responsesContainer.scrollHeight;
    }
  });

  // Add an event listener to submit the question when the enter key is pressed
  questionInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submitQuestionButton.click();
    }
  });
}

function getSelectedText() {
  const selection = window.getSelection();
  return selection.toString().trim();
}

function getAllText() {
  const bodyText = document.body.innerText;
  return bodyText.trim();
}

function splitText(text, maxTokens = 3000) {
  const chunks = [];
  let currentChunk = "";
  const sentences = text.split(". ");

  for (const sentence of sentences) {
    const newChunk = currentChunk ? `${currentChunk}. ${sentence}` : sentence;
    if (newChunk.length > maxTokens) {
      chunks.push(currentChunk);
      currentChunk = sentence;
    } else {
      currentChunk = newChunk;
    }
  }
  if (currentChunk) {
    chunks.push(currentChunk);
  }
  return chunks;
}

async function findMostSimilarSection(apiKey, query, contexts) {
  const queryEmbedding = await fetchEmbeddingsFromBackground(apiKey, query);

  function vectorSimilarity(x, y) {
    let sum = 0;
    for (let i = 0; i < x.length; i++) {
      sum += x[i] * y[i];
    }
    return sum;
  }

  let maxSimilarity = -Infinity;
  let mostSimilarSectionIndex;

  for (const index in contexts) {
    const similarity = vectorSimilarity(
      queryEmbedding,
      contexts[index].embedding
    );
    if (similarity > maxSimilarity) {
      maxSimilarity = similarity;
      mostSimilarSectionIndex = index;
    }
  }

  const mostSimilarSection = contexts[mostSimilarSectionIndex];
  const title = mostSimilarSection.title;
  const heading = mostSimilarSection.heading;
  const content = mostSimilarSection.content;

  return { title, heading, content };
}

async function generateSummaries(apiKey, textChunks, batch = false) {
  let summaries = [];

  if (batch) {
    // Fetch summaries in a single batch request
    summaries = await fetchSummaries(apiKey, textChunks);

    // Update the progress bar for each summary
    summaries.forEach((_, i) => {
      updateProgressBar(i + 1, textChunks.length);
    });
  } else {
    // Fetch summaries one at a time
    for (const [index, chunk] of textChunks.entries()) {
      const summary = await fetchSummary(apiKey, chunk);
      summaries.push(summary);
      updateProgressBar(index + 1, textChunks.length);
    }
  }

  // display the text chunks along with their summaries in the console
  textChunks.forEach((chunk, i) => {
    console.log("Text chunk:", chunk);
    console.log("Summary:", summaries[i]);
  });

  return summaries;
}

if (!window.contentScriptLoaded) {
  window.contentScriptLoaded = true;

  chrome.runtime.onMessage.addListener(
    async (request, sender, sendResponse) => {
      if (request.text === "generate_tldr") {
        console.log("Message received in content script");

        // Check if any text is selected
        let text = getSelectedText();
        if (!text) {
          // If no text is selected, use all text from the page
          text = getAllText();
        }

        console.log("Text to summarize:", text);

        if (text) {
          const textChunks = splitText(text);

          // Show the loading modal with the progress bar
          showModal(textChunks.length);

          // Retrieve the API key from storage
          chrome.storage.sync.get("apiKey", async (data) => {
            if (data.apiKey) {
              const apiKey = data.apiKey;
              const summaries = await generateSummaries(apiKey, textChunks);
              const combinedSummaries = summaries.join(" ");
              const finalSummary = await fetchSummary(
                apiKey,
                combinedSummaries
              );

              // Hide the loading modal
              hideModal();

              // Initialize the message history
              const messageHistory = [
                {
                  role: "user",
                  content: `Please provide a TLDR of the following text. Keep it super short and barebones, removing any extraneous information. Write in abbreviated style, no extra words:`,
                },
                ...summaries.map((summary) => ({
                  role: "user",
                  content: summary,
                })),
                {
                  role: "assistant",
                  content: finalSummary,
                },
              ];

              // Show the summary modal with the message history
              showSummaryModal(finalSummary, apiKey, messageHistory);
            } else {
              // Hide the loading modal
              hideModal();

              alert("Please set your OpenAI API key in the extension options.");
            }
          });
        }
      }
    }
  );
}
