// --- 1. GLOBAL VARIABLES & STATE ---
let chatHistory = [];
let selectedProducts = JSON.parse(localStorage.getItem('loreal_routine_cart')) || [];
let allProducts = []; 

// --- 2. DOM ELEMENTS ---
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const chatInput = document.getElementById("userInput"); 
const selectedListContainer = document.getElementById("selectedProductsList"); 
const generateBtn = document.getElementById("generateRoutine");

// --- 3. INITIALIZATION ---
async function init() {
  try {
    const response = await fetch("products.json");
    const data = await response.json();
    allProducts = data.products;
    renderSelectedList(); 
    productsContainer.innerHTML = `<div class="placeholder-message">Select a category to view products</div>`;
  } catch (error) {
    console.error("Error loading products:", error);
  }
}
init();

// --- 4. DISPLAY PRODUCTS ---
function displayProducts(products) {
  if (!products || products.length === 0) {
    productsContainer.innerHTML = `<div class="placeholder-message">No products found.</div>`;
    return;
  }

  productsContainer.innerHTML = products.map((product) => {
    const isSelected = selectedProducts.some(p => String(p.id) === String(product.id));
    return `
      <div class="product-card ${isSelected ? 'is-selected' : ''}" onclick="handleProductClick('${product.id}')">
        <img src="${product.image}" alt="${product.name}">
        <div class="product-info">
          <h3>${product.name}</h3>
          <p><strong>${product.brand}</strong></p>
          <p class="desc-text">${product.description || ''}</p>
        </div>
      </div>
    `;
  }).join("");
}

// --- 5. FILTER LOGIC ---
if (categoryFilter) {
  categoryFilter.addEventListener("change", (e) => {
    const filtered = allProducts.filter(p => p.category === e.target.value);
    displayProducts(filtered);
  });
}

// --- 6. PRODUCT SELECTION LOGIC ---
window.handleProductClick = function(productId) {
  const product = allProducts.find(p => String(p.id) === String(productId));
  if (product) toggleProduct(product);
};

function toggleProduct(product) {
  const index = selectedProducts.findIndex(p => String(p.id) === String(product.id));
  if (index === -1) {
    selectedProducts.push(product);
  } else {
    selectedProducts.splice(index, 1);
  }
  saveToStorage();
  const filtered = allProducts.filter(p => p.category === categoryFilter.value);
  displayProducts(filtered);
}

function saveToStorage() {
  localStorage.setItem('loreal_routine_cart', JSON.stringify(selectedProducts));
  renderSelectedList(); 
}

function renderSelectedList() {
  if (!selectedListContainer) return;
  if (selectedProducts.length === 0) {
    selectedListContainer.innerHTML = "<p>No products selected yet.</p>";
    return;
  }
  selectedListContainer.innerHTML = selectedProducts.map(p => `
    <div class="selected-item" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; background: #f9f9f9; padding: 5px; border-radius: 4px; color: black;">
      <span style="font-size: 0.9rem;">${p.name}</span>
      <button onclick="handleProductClick('${p.id}')" style="background: #ff003b; color: white; border: none; padding: 2px 8px; cursor: pointer; border-radius: 3px;">×</button>
    </div>
  `).join('');
}

// --- 7. CHAT LOGIC ---
function displayChatMessage(role, text) {
  const messageDiv = document.createElement("div");
  messageDiv.style.marginBottom = "15px";
  messageDiv.style.padding = "10px";
  messageDiv.style.borderRadius = "8px";
  
  if (role === 'user') {
    messageDiv.style.background = "#eee";
    messageDiv.style.textAlign = "right";
    messageDiv.style.color = "black";
  } else {
    messageDiv.style.background = "#fff0f2";
    messageDiv.style.borderLeft = "4px solid #ff003b";
    messageDiv.style.color = "black";
  }
  
  messageDiv.innerHTML = `<strong>${role === 'user' ? 'You' : 'Advisor'}:</strong> <p>${text}</p>`;
  chatWindow.appendChild(messageDiv);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// 8. CHAT LOGIC 

// THIS IS THE LINK TO YOUR CLOUDFLARE WORKER
const WORKER_URL = 'https://lorealchatbot1.ttrrippyy.workers.dev/';

// Helper function to call the worker correctly
async function callWorker(messagesArray) {
  try {
    const response = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Your worker REQUIRES a property named "messages"
      body: JSON.stringify({ messages: messagesArray })
    });

    const data = await response.json();

    // Since your worker returns the raw OpenAI response, we need choices[0].message.content
    if (data.choices && data.choices[0] && data.choices[0].message) {
      return data.choices[0].message.content;
    } else if (data.error) {
      return `API Error: ${data.error.message || "Unknown error"}`;
    }
    
    // Fallback if data structure is unexpected
    return typeof data === 'string' ? data : JSON.stringify(data);

  } catch (error) {
    console.error("Fetch Error:", error);
    return "I'm having trouble connecting to the beauty server. Please check your Worker logs.";
  }
}

// Helper to display messages in the UI
function displayChatMessage(role, text) {
  const messageDiv = document.createElement("div");
  messageDiv.style.marginBottom = "15px";
  messageDiv.style.padding = "10px";
  messageDiv.style.borderRadius = "8px";
  
  if (role === 'user') {
    messageDiv.style.background = "#eee";
    messageDiv.style.textAlign = "right";
    messageDiv.style.color = "black";
  } else {
    messageDiv.style.background = "#fff0f2";
    messageDiv.style.borderLeft = "4px solid #ff003b";
    messageDiv.style.color = "black";
  }
  
  messageDiv.innerHTML = `<strong>${role === 'user' ? 'You' : 'Advisor'}:</strong> <p>${text}</p>`;
  chatWindow.appendChild(messageDiv);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// Generate Routine Button Logic
if (generateBtn) {
  generateBtn.addEventListener("click", async () => {
    if (selectedProducts.length === 0) return alert("Please select some products first!");

    const productData = selectedProducts.map(p => `- ${p.brand} ${p.name}: ${p.description}`).join('\n');
    const userPrompt = `I have selected these products:\n${productData}\n\nPlease create a personalized routine for me.`;

    displayChatMessage('user', "Generating my personalized routine...");
    
    // 1. Add to local history
    chatHistory.push({ role: "user", content: userPrompt });

    // 2. Call Worker
    const aiReply = await callWorker(chatHistory);
    
    // 3. Add AI reply to history and show it
    chatHistory.push({ role: "assistant", content: aiReply });
    displayChatMessage('assistant', aiReply);
  });
}

// Chat Form (Follow-ups) Logic
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const message = chatInput.value.trim();
  if (!message) return;

  chatInput.value = "";
  displayChatMessage('user', message);
  
  // 1. Add to local history
  chatHistory.push({ role: "user", content: message });

  // 2. Call Worker
  const aiReply = await callWorker(chatHistory);
  
  // 3. Add AI reply to history and show it
  chatHistory.push({ role: "assistant", content: aiReply });
  displayChatMessage('assistant', aiReply);
});