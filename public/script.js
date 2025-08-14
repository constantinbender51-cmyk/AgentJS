document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.getElementById('chat-form');
    const messageInput = document.getElementById('message-input');
    const chatWindow = document.getElementById('chat-window');

    // The conversation history array that will be sent to the backend
    let conversationHistory = [
        {
            role: "user",
            parts: [{ text: "You are AgentJS, a helpful and friendly AI assistant with access to tools. Keep your responses concise and conversational." }],
        },
        {
            role: "model",
            parts: [{ text: "Understood! I'm AgentJS. I'm ready to help." }],
        }
    ];

    // Function to add a message to the chat window
    const addMessage = (sender, text) => {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', `${sender}-message`);
        
        const paragraph = document.createElement('p');
        paragraph.textContent = text;
        messageElement.appendChild(paragraph);
        
        chatWindow.appendChild(messageElement);
        chatWindow.scrollTop = chatWindow.scrollHeight; // Auto-scroll to the latest message
        return messageElement; // Return the element to allow modification (e.g., for loading)
    };

    // Handle form submission
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userMessage = messageInput.value.trim();
        if (!userMessage) return;

        // Add user message to UI and history
        addMessage('user', userMessage);
        conversationHistory.push({ role: 'user', parts: [{ text: userMessage }] });

        // Clear the input field and show a loading indicator
        messageInput.value = '';
        const loadingElement = addMessage('ai loading', 'Thinking');

        try {
            // Send the entire history to the backend
            const response = await fetch('/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ history: conversationHistory }),
            });

            // Remove the loading indicator
            loadingElement.remove();

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'An unknown error occurred.');
            }

            const data = await response.json();
            const aiMessage = data.message;

            // Add AI response to UI and history
            addMessage('ai', aiMessage);
            conversationHistory.push({ role: 'model', parts: [{ text: aiMessage }] });

        } catch (error) {
            // Remove loading indicator and show an error message
            loadingElement.remove();
            console.error('Error:', error);
            addMessage('ai error', `Sorry, something went wrong: ${error.message}`);
        }
    });
});
