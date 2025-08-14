document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM loaded. Script starting."); // Log 1

    const chatForm = document.getElementById('chat-form');
    const messageInput = document.getElementById('message-input');
    const chatWindow = document.getElementById('chat-window');

    let conversationHistory = [
        { role: "user", parts: [{ text: "You are AgentJS, a helpful and friendly AI assistant with access to tools. Keep your responses concise and conversational." }] },
        { role: "model", parts: [{ text: "Understood! I'm AgentJS. I'm ready to help." }] }
    ];

    const addMessage = (sender, text) => {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', `${sender}-message`);
        const paragraph = document.createElement('p');
        paragraph.textContent = text;
        messageElement.appendChild(paragraph);
        chatWindow.appendChild(messageElement);
        chatWindow.scrollTop = chatWindow.scrollHeight;
        return messageElement;
    };

    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log("Form submitted."); // Log 2

        const userMessage = messageInput.value.trim();
        if (!userMessage) return;

        console.log("User message:", userMessage); // Log 3
        addMessage('user', userMessage);
        conversationHistory.push({ role: 'user', parts: [{ text: userMessage }] });

        messageInput.value = '';
        console.log("Displaying 'Thinking...' message."); // Log 4
        const loadingElement = addMessage('ai loading', 'Thinking');

        try {
            console.log("Sending fetch request to /chat..."); // Log 5
            const response = await fetch('/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ history: conversationHistory }),
            });

            console.log("Fetch response received."); // Log 6
            loadingElement.remove();

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'An unknown error occurred.');
            }

            const data = await response.json();
            const aiMessage = data.message;

            addMessage('ai', aiMessage);
            conversationHistory.push({ role: 'model', parts: [{ text: aiMessage }] });

        } catch (error) {
            console.error('Fetch failed:', error); // Log 7 (Error)
            loadingElement.remove();
            addMessage('ai error', `Sorry, a client-side error occurred: ${error.message}`);
        }
    });
});
