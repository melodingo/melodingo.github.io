document.addEventListener('DOMContentLoaded', function() {
    // Open terminal when button is clicked
    document.querySelector('.easter-egg').addEventListener('click', function(e) {
      e.preventDefault();  // Prevent default action of the link
      document.getElementById('terminal').style.display = 'block'; // Show the terminal
    });
  
    // Make the terminal draggable
    const terminal = document.getElementById('terminal');
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
      document.getElementById('terminal').style.display = 'none';
    }
  
    // Close button inside the terminal
    document.querySelector('.close-btn').addEventListener('click', closeTerminal);
  
    // Process commands typed in the terminal
    document.getElementById('terminalInput').addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        const input = e.target.value.trim();
        const outputDiv = document.getElementById('terminalOutput');
  
        // Example of some simple commands
        if (input === 'hello') {
          outputDiv.innerHTML += '<div>Terminal says: Hello, World!</div>';
        } else if (input === 'clear') {
          outputDiv.innerHTML = '';
        } else {
          outputDiv.innerHTML += `<div>Unknown command: ${input}</div>`;
        }
  
        e.target.value = ''; // Clear input after command
      }
    });
  });
  
  