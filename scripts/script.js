document.addEventListener('DOMContentLoaded', function() {
    // Get canvas and context
    const canvas = document.getElementById('drawingCanvas');
    const ctx = canvas.getContext('2d');
    
    // State management
    let drawing = false;
    let lastX = 0;
    let lastY = 0;
    let drawingHistory = [];
    let historyIndex = -1;
    let currentPath = [];
    
    // Default settings
    let currentColor = document.getElementById('colorPicker').value;
    let currentBrushSize = parseInt(document.getElementById('brushSize').value);
    let isDrawingMode = true;
    
    // Initialize canvas
    function initializeCanvas() {
        // Set canvas dimensions to match container
        const container = document.querySelector('.canvas-container');
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        
        // Set initial canvas background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Set line properties
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        
        // Save initial state to history
        saveToHistory();
    }
    
    // Draw on canvas
    function draw(e) {
        if (!drawing || !isDrawingMode) return;
        
        e.preventDefault();
        
        // Get current position (handles both mouse and touch)
        let clientX, clientY;
        if (e.type.includes('touch')) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        
        // Calculate position relative to canvas
        const rect = canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        
        // Draw line
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(x, y);
        ctx.strokeStyle = currentColor;
        ctx.lineWidth = currentBrushSize;
        ctx.stroke();
        
        // Store point in current path for undo/redo functionality
        currentPath.push({x, y, color: currentColor, size: currentBrushSize});
        
        // Update last position
        lastX = x;
        lastY = y;
    }
    
    // Start drawing
    function startDrawing(e) {
        if (!isDrawingMode) return;
        
        drawing = true;
        
        // Get position
        let clientX, clientY;
        if (e.type.includes('touch')) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        
        // Calculate position relative to canvas
        const rect = canvas.getBoundingClientRect();
        lastX = clientX - rect.left;
        lastY = clientY - rect.top;
        
        // Start new path
        currentPath = [{x: lastX, y: lastY, color: currentColor, size: currentBrushSize}];
    }
    
    // Stop drawing
    function stopDrawing() {
        if (drawing) {
            drawing = false;
            
            // Save completed path to history
            if (currentPath.length > 0) {
                saveToHistory();
            }
        }
    }
    
    // Save current canvas state to history
    function saveToHistory() {
        // Remove any redo states if we're not at the end
        if (historyIndex < drawingHistory.length - 1) {
            drawingHistory = drawingHistory.slice(0, historyIndex + 1);
        }
        
        // Save current canvas state
        drawingHistory.push(canvas.toDataURL());
        historyIndex++;
        
        // Update undo/redo button states
        updateUndoRedoButtons();
    }
    
    // Undo last drawing
    function undo() {
        if (historyIndex > 0) {
            historyIndex--;
            restoreFromHistory();
        }
    }
    
    // Redo last undone drawing
    function redo() {
        if (historyIndex < drawingHistory.length - 1) {
            historyIndex++;
            restoreFromHistory();
        }
    }
    
    // Restore canvas from history
    function restoreFromHistory() {
        const img = new Image();
        img.onload = function() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
        };
        img.src = drawingHistory[historyIndex];
        
        updateUndoRedoButtons();
    }
    
    // Update undo/redo button states
    function updateUndoRedoButtons() {
        document.getElementById('undoBtn').disabled = historyIndex <= 0;
        document.getElementById('redoBtn').disabled = historyIndex >= drawingHistory.length - 1;
    }
    
    // Clear the canvas
    function clearCanvas() {
        if (confirm("Are you sure you want to clear the canvas?")) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            saveToHistory();
        }
    }
    
    // Save drawing as PNG
    function saveDrawing() {
        const link = document.createElement('a');
        link.download = 'drawing-' + new Date().toISOString().slice(0, 10) + '.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    }
    
    // Update brush size display
    function updateBrushSizeDisplay() {
        document.getElementById('brushSizeValue').textContent = currentBrushSize + 'px';
    }
    
    // Event Listeners
    
    // Mouse events
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    
    // Touch events for mobile
    canvas.addEventListener('touchstart', function(e) {
        startDrawing(e);
        // Prevent scrolling while drawing
        e.preventDefault();
    }, { passive: false });
    
    canvas.addEventListener('touchmove', function(e) {
        draw(e);
        // Prevent scrolling while drawing
        e.preventDefault();
    }, { passive: false });
    
    canvas.addEventListener('touchend', stopDrawing);
    canvas.addEventListener('touchcancel', stopDrawing);
    
    // Control buttons
    document.getElementById('clearBtn').addEventListener('click', clearCanvas);
    document.getElementById('undoBtn').addEventListener('click', undo);
    document.getElementById('redoBtn').addEventListener('click', redo);
    document.getElementById('saveBtn').addEventListener('click', saveDrawing);
    
    // Color picker
    document.getElementById('colorPicker').addEventListener('input', function(e) {
        currentColor = e.target.value;
    });
    
    // Brush size
    document.getElementById('brushSize').addEventListener('input', function(e) {
        currentBrushSize = parseInt(e.target.value);
        updateBrushSizeDisplay();
    });
    
    // Drawing mode toggle
    const drawingToggle = document.getElementById('drawingToggle');
    const toggleLabel = document.querySelector('.toggle-label');
    
    drawingToggle.addEventListener('change', function() {
        isDrawingMode = this.checked;
        toggleLabel.textContent = `Drawing Mode: ${isDrawingMode ? 'ON' : 'OFF'}`;
        
        // Change cursor based on mode
        canvas.style.cursor = isDrawingMode ? 'crosshair' : 'default';
    });
    
    // Handle window resize
    window.addEventListener('resize', function() {
        // Save current drawing
        const currentDrawing = canvas.toDataURL();
        
        // Resize canvas
        initializeCanvas();
        
        // Restore drawing
        const img = new Image();
        img.onload = function() {
            ctx.drawImage(img, 0, 0);
        };
        img.src = currentDrawing;
    });
    
    // Initialize the canvas
    initializeCanvas();
    updateBrushSizeDisplay();
    updateUndoRedoButtons();
    
    // Add a welcome message drawn on the canvas
    setTimeout(() => {
        ctx.font = '24px Arial';
        ctx.fillStyle = '#4a6fa5';
        ctx.textAlign = 'center';
        ctx.fillText('Start drawing here!', canvas.width / 2, canvas.height / 2);
        
        ctx.font = '18px Arial';
        ctx.fillStyle = '#666';
        ctx.fillText('Use the controls below to change colors and brush size', canvas.width / 2, canvas.height / 2 + 30);
    }, 500);
});

