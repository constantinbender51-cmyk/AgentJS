document.addEventListener('DOMContentLoaded', () => {
    // We assume the script starts correctly if the page loads.
    const chatForm = document.getElementById('chat-form');
    const messageInput = document.getElementById('message-input');
    const chatWindow = document.getElementById('chat-window');

    // This is our function to add any message to the screen, including errors.
    const addMessage = (sender, text) => {
        try {
            const messageElement = document.createElement('div');
            messageElement.classList.add('message', `${sender}-message`);
            const paragraph = document.createElement('p');
            paragraph.textContent = text;
            messageElement.appendChild(paragraph);
            chatWindow.appendChild(messageElement);
            chatWindow.scrollTop = chatWindow.scrollHeight;
            return messageElement;
        } catch (e) {
            // If even adding a message fails, we are in deep trouble.
            // This is a last resort alert.
            alert("A critical error occurred while trying to display a message. Error: " + e.message);
        }
    };

    // We wrap the entire logic in a try...catch block.
    try {
        let conversationHistory = [
            { role: "user", parts: [{ text: "You are AgentJS, a helpful and friendly AI assistant with access to tools. Keep your responses concise and conversational." }] },
            { role: "model", parts: [{ text: "Understood! I'm AgentJS. I'm ready to help." }] }
        ];

        chatForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const userMessage = messageInput.value.trim();
            if (!userMessage) return;

            addMessage('user', userMessage);
            conversationHistory.push({ role: 'user', parts: [{ text: userMessage }] });
            messageInput.value = '';
            
            const loadingElement = addMessage('ai loading', 'Thinking...');

            try {
                const response = await fetch('/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ history: conversationHistory }),
                });

                loadingElement.remove();

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(`Server Error: ${response.status} - ${errorData.error || 'Unknown'}`);
                }

                const data = await response.json();
                const aiMessage = data.message;

                addMessage('ai', aiMessage);
                conversationHistory.push({ role: 'model', parts: [{ text: aiMessage }] });

            } catch (fetchError) {
                // If the fetch fails, display the error on screen.
                loadingElement.remove();
                addMessage('ai error', `Error communicating with server: ${fetchError.message}`);
            }
        });

    } catch (initializationError) {
        // If the initial setup fails, display the error on screen.
        addMessage('ai error', `A critical error occurred on startup: ${initializationError.message}`);
    }
});
