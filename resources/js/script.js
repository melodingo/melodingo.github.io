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
            const input = e.target.innerText.trim(); // Get the text from the content-editable div
            const outputDiv = document.getElementById('terminalOutput');

            // Example of some simple commands
            if (input === 'hello') {
                outputDiv.innerHTML += '<div>Terminal says: Wassup!</div>';
            } else if (input === 'clear') {
                outputDiv.innerHTML = '';
            } else if (input === 'cls') {
                outputDiv.innerHTML = '';
            } else {
                outputDiv.innerHTML += `<div>Unknown command: ${input}</div>`;
            }

            e.target.innerText = ''; // Clear input after command
            outputDiv.scrollTop = outputDiv.scrollHeight; // Scroll to the bottom of the output.
        }
    });
});
