document.addEventListener('DOMContentLoaded', function() {
    // Hide terminal on load
    const terminal = document.getElementById('terminal');
    terminal.style.display = 'none';

    // Open terminal when button is clicked
    document.querySelector('.easter-egg').addEventListener('click', function(e) {
        e.preventDefault(); // Prevent default action of the link
        terminal.style.display = 'block'; // Show the terminal
    });

    // Make the terminal draggable
    const header = terminal.querySelector('.terminal-header');

    let isDragging = false;
    let offsetX, offsetY;

    // When the header is clicked and held
    header.addEventListener('mousedown', function(e) {
        isDragging = true;

        // Calculate the initial offset position of the mouse relative to the terminal
        offsetX = e.clientX - terminal.offsetLeft;
        offsetY = e.clientY - terminal.offsetTop;
    });

    // When the mouse moves (dragging)
    document.addEventListener('mousemove', function(e) {
        if (isDragging) {
            // Update the position of the terminal
            terminal.style.left = e.clientX - offsetX + 'px';
            terminal.style.top = e.clientY - offsetY + 'px';
        }
    });

    // When the mouse button is released (stop dragging)
    document.addEventListener('mouseup', function() {
        isDragging = false;
    });

    // Close the terminal
    function closeTerminal() {
        terminal.style.display = 'none';
    }

    // Add click event for the red circle to close the terminal
    terminal.querySelector('.circle.red').addEventListener('click', closeTerminal);

    // Add click event for the yellow circle to minimize the terminal
    terminal.querySelector('.circle.yellow').addEventListener('click', function() {
        terminal.style.display = 'none';
    });

    // Add click event for the green circle to maximize/minimize the terminal
    terminal.querySelector('.circle.green').addEventListener('click', function() {
        if (terminal.style.width !== '100%') {
            terminal.style.top = '0';
            terminal.style.left = '0';
            terminal.style.width = '100%';
            terminal.style.height = '100%';
        } else {
            terminal.style.top = '20%';
            terminal.style.left = '20%';
            terminal.style.width = '600px';
            terminal.style.height = '400px';
        }
    });

    // Process commands typed in the terminal
    const terminalInput = document.getElementById('terminalInput');
    terminalInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
        const input = e.target.innerText.trim().toLowerCase(); // normalize input
        const outputDiv = document.getElementById('terminalOutput');
        let response = '';

            switch (input) {
                case 'hello':
                    response = 'Terminal says: Wassup!';
                    break;
                case 'clear':
                case 'cls':
                    outputDiv.innerHTML = '';
                    e.target.innerText = '';
                    return;
                case 'help':
                    response = `Available commands:
                    - hello        👉 Terminal greets you
                    - clear / cls  👉 Clears the screen
                    - joke         👉 Tells a bad joke
                    - hack         👉 Simulates hacking animation
                    - fortune      👉 Gives a deep thought
                    - dance        👉 💃 Terminal boogies
                    - beep         👉 (Imagine a loud beep!)
                    - sudo         👉 You’re not root, but okay...
                    - ascii        👉 Shows some ASCII art`;
                    break;
                case 'joke':
                    response = "Why do programmers hate nature? Too many bugs.";
                    break;
                case 'hack':
                    response = "Accessing mainframe...\nBypassing firewall...\nDownloading cookies 🍪...\nJust kidding.";
                    break;
                case 'fortune':
                    response = "“Talk is cheap. Show me the code.” – Linus Torvalds";
                    break;
                case 'dance':
                    response = "♪┏(・o･)┛♪┗ ( ･o･) ┓♪ Terminal is dancing!";
                    break;
                case 'beep':
                    response = "*BEEP* (Use your imagination)";
                    break;
                case 'sudo':
                    response = "Nice try. You still don't have permissions 😎";
                    break;
                case 'ascii':
                    response = `
                        (\\__/)
                        (•ㅅ•)
                        / 　 づ
                        Cute terminal bunny says hi!`;
                        break;
                        default:
                            response = `Unknown command: ${input}. Try typing 'help'.`;
            }

            outputDiv.innerHTML += `<div>> ${input}</div><div>${response}</div>`;
            e.target.innerText = ''; // Clear input
            outputDiv.scrollTop = outputDiv.scrollHeight; // Auto scroll
        }
    });
});
