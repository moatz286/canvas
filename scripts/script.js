document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('drawingCanvas');
    const ctx = canvas.getContext('2d');
    
    // الحالات
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;
    let history = [];
    let currentState = -1;
    let currentMode = 'draw'; // 'draw' or 'type'
    let textElements = [];
    let selectedTextElement = null;
    let isAddingText = false;
    let textPosition = { x: 0, y: 0 };
    let isDraggingText = false;
    let dragStartX = 0;
    let dragStartY = 0;
    
    // إعدادات الرسم
    let currentColor = document.getElementById('colorPicker').value;
    let currentBrushSize = parseInt(document.getElementById('brushSize').value);
    
    // إعدادات الكتابة
    let currentFontFamily = document.getElementById('fontFamily').value;
    let currentFontSize = parseInt(document.getElementById('fontSize').value);
    let currentTextAlign = 'right';
    
    // عناصر DOM
    const textCursor = document.getElementById('textCursor');
    const textInput = document.getElementById('textInput');
    const textInputContainer = document.querySelector('.text-input-container');
    const drawingTools = document.querySelector('.drawing-tools');
    const typingTools = document.querySelector('.typing-tools');
    const virtualKeyboard = document.getElementById('virtualKeyboard');
    const keyboardKeys = document.querySelector('.keyboard-keys');
    
    // تهيئة اللوحة
    function setupCanvas() {
        const container = document.querySelector('.canvas-container');
        const dpr = window.devicePixelRatio || 1;
        const rect = container.getBoundingClientRect();
        
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
        
        ctx.scale(dpr, dpr);
        
        // خلفية بيضاء
        ctx.fillStyle = '#fffcf9';
        ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);
        
        // إعدادات الرسم الافتراضية
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = currentColor;
        ctx.lineWidth = currentBrushSize;
        ctx.fillStyle = currentColor;
    }
    
    // حفظ حالة اللوحة
    function saveState() {
        currentState++;
        if (currentState < history.length) {
            history.length = currentState;
        }
        const state = {
            image: canvas.toDataURL(),
            textElements: JSON.parse(JSON.stringify(textElements))
        };
        history.push(state);
        updateUndoRedoButtons();
    }
    
    // استعادة حالة
    function restoreState() {
        if (currentState < 0 || currentState >= history.length) return;
        
        const state = history[currentState];
        const img = new Image();
        img.onload = function() {
            const dpr = window.devicePixelRatio || 1;
            const container = document.querySelector('.canvas-container');
            const rect = container.getBoundingClientRect();
            
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.save();
            ctx.scale(1/dpr, 1/dpr);
            ctx.drawImage(img, 0, 0, rect.width * dpr, rect.height * dpr);
            ctx.restore();
            
            textElements = state.textElements ? JSON.parse(JSON.stringify(state.textElements)) : [];
            redrawTextElements();
        };
        img.src = state.image;
        updateUndoRedoButtons();
    }
    
    // تحديث أزرار التراجع/إعادة
    function updateUndoRedoButtons() {
        const undoBtn = document.getElementById('undoBtn');
        const redoBtn = document.getElementById('redoBtn');
        
        if (undoBtn) undoBtn.disabled = currentState <= 0;
        if (redoBtn) redoBtn.disabled = currentState >= history.length - 1;
    }
    
    // تبديل الوضع
    function switchMode(mode) {
        currentMode = mode;
        
        // تحديث الأزرار
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });
        
        // تحديث النص
        document.getElementById('currentModeText').textContent = 
            `الوضع الحالي: ${mode === 'draw' ? 'الرسم' : 'الكتابة'}`;
        
        // إظهار/إخفاء الأدوات
        if (drawingTools) drawingTools.style.display = mode === 'draw' ? 'flex' : 'none';
        if (typingTools) typingTools.style.display = mode === 'type' ? 'block' : 'none';
        if (textInputContainer) textInputContainer.style.display = mode === 'type' ? 'block' : 'none';
        
        // إخفاء المؤشر النصي
        if (textCursor) textCursor.style.display = 'none';
        
        // إلغاء تحديد النصوص
        if (selectedTextElement) {
            selectedTextElement.selected = false;
            selectedTextElement = null;
            redrawTextElements();
        }
        
        // إلغاء وضع الإضافة
        isAddingText = false;
        if (textInput) textInput.value = '';
        
        // تغيير شكل المؤشر
        canvas.style.cursor = mode === 'draw' ? 'crosshair' : 'default';
        
        // إخفاء لوحة المفاتيح
        hideVirtualKeyboard();
    }
    
    // إعادة رسم النصوص (Optimized)
    function redrawTextElements() {
        // حفظ حالة الرسومات الحالية
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        tempCtx.drawImage(canvas, 0, 0);
        
        // مسح اللوحة الأساسية
        const dpr = window.devicePixelRatio || 1;
        const container = document.querySelector('.canvas-container');
        const rect = container.getBoundingClientRect();
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(tempCanvas, 0, 0);
        
        // رسم جميع النصوص
        textElements.forEach(text => {
            drawTextOnCanvas(text);
        });
    }
    
    // رسم نص على اللوحة
    function drawTextOnCanvas(text) {
        ctx.save();
        
        // حساب DPR للنسب الصحيحة
        const dpr = window.devicePixelRatio || 1;
        const scaleX = 1 / dpr;
        const scaleY = 1 / dpr;
        
        ctx.scale(scaleX, scaleY);
        
        ctx.font = `${text.fontSize * dpr}px ${text.fontFamily}`;
        ctx.fillStyle = text.color;
        ctx.textAlign = text.align;
        ctx.textBaseline = 'top';
        
        // حساب عرض وارتفاع النص
        const metrics = ctx.measureText(text.content);
        const textWidth = metrics.width / dpr;
        const textHeight = text.fontSize;
        
        // تحديث أبعاد العنصر النصي
        text.width = textWidth;
        text.height = textHeight;
        
        // إضافة تأثير التحديد إذا كان محدداً
        if (text.selected) {
            ctx.strokeStyle = '#ac6d2a';
            ctx.lineWidth = 2 * dpr;
            ctx.setLineDash([5 * dpr, 3 * dpr]);
            
            let x = text.x * dpr;
            if (text.align === 'center') x -= (textWidth * dpr) / 2;
            if (text.align === 'right') x -= textWidth * dpr;
            
            ctx.strokeRect(
                x - 5 * dpr,
                text.y * dpr - 5 * dpr,
                textWidth * dpr + 10 * dpr,
                textHeight * dpr + 10 * dpr
            );
            ctx.setLineDash([]);
        }
        
        // رسم النص
        ctx.fillText(text.content, text.x * dpr, text.y * dpr);
        ctx.restore();
    }
    
    // إضافة نص جديد
    function addTextElement(x, y, content) {
        const textElement = {
            id: Date.now() + Math.random(),
            x: x,
            y: y,
            content: content,
            color: currentColor,
            fontFamily: currentFontFamily,
            fontSize: currentFontSize,
            align: currentTextAlign,
            width: 0,
            height: 0,
            selected: true
        };
        
        if (selectedTextElement) {
            selectedTextElement.selected = false;
        }
        
        selectedTextElement = textElement;
        textElements.push(textElement);
        
        // رسم النص
        drawTextOnCanvas(textElement);
        
        // حفظ الحالة
        saveState();
        
        return textElement;
    }
    
    // تحديث نص موجود
    function updateTextElement(element, newContent) {
        if (!element) return;
        
        element.content = newContent;
        redrawTextElements();
        saveState();
    }
    
    // حذف نص محدد
    function deleteSelectedText() {
        if (!selectedTextElement) return;
        
        const index = textElements.findIndex(t => t.id === selectedTextElement.id);
        if (index !== -1) {
            textElements.splice(index, 1);
            selectedTextElement = null;
            redrawTextElements();
            saveState();
        }
    }
    
    // التحقق إذا كان النقرة على نص
    function getTextAtPosition(x, y) {
        for (let i = textElements.length - 1; i >= 0; i--) {
            const text = textElements[i];
            
            let textX = text.x;
            if (text.align === 'center') textX -= text.width / 2;
            if (text.align === 'right') textX -= text.width;
            
            if (x >= textX - 10 && x <= textX + text.width + 10 &&
                y >= text.y - 10 && y <= text.y + text.height + 10) {
                return text;
            }
        }
        return null;
    }
    
    // تحريك نص
    function moveTextElement(text, x, y) {
        text.x = x;
        text.y = y;
        redrawTextElements();
    }
    
    // عرض مؤشر النص
    function showTextCursor(x, y) {
        if (!textCursor) return;
        
        const container = document.querySelector('.canvas-container');
        const rect = container.getBoundingClientRect();
        
        textCursor.style.left = `${rect.left + x}px`;
        textCursor.style.top = `${rect.top + y}px`;
        textCursor.style.display = 'block';
        textCursor.style.height = `${currentFontSize}px`;
    }
    
    // إخفاء مؤشر النص
    function hideTextCursor() {
        if (textCursor) textCursor.style.display = 'none';
    }
    
    // بدء وضع الكتابة
    function startAddingText(x, y) {
        isAddingText = true;
        textPosition = { x: x, y: y };
        showTextCursor(x, y);
        
        if (textInput) {
            textInput.value = '';
            textInput.focus();
        }
        
        // إظهار لوحة المفاتيح على الهواتف
        if (isMobile()) {
            showVirtualKeyboard();
        }
    }
    
    // إنهاء وضع الكتابة
    function finishAddingText() {
        if (textInput && textInput.value.trim()) {
            addTextElement(textPosition.x, textPosition.y, textInput.value.trim());
        }
        isAddingText = false;
        hideTextCursor();
        if (textInput) textInput.value = '';
        
        // إخفاء لوحة المفاتيح
        hideVirtualKeyboard();
    }
    
    // إلغاء وضع الكتابة
    function cancelAddingText() {
        isAddingText = false;
        hideTextCursor();
        if (textInput) textInput.value = '';
        hideVirtualKeyboard();
    }
    
    // التحقق من جهاز محمول
    function isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
               (window.innerWidth <= 768);
    }
    
    // معالجة الرسم
    function startDraw(e) {
        if (currentMode !== 'draw') return;
        
        const pos = getCanvasPosition(e);
        isDrawing = true;
        [lastX, lastY] = [pos.x, pos.y];
        
        // رسم نقطة في البداية
        ctx.beginPath();
        ctx.arc(lastX, lastY, ctx.lineWidth / 2, 0, Math.PI * 2);
        ctx.fill();
        
        e.preventDefault();
    }
    
    function draw(e) {
        if (!isDrawing || currentMode !== 'draw') return;
        
        const pos = getCanvasPosition(e);
        const currentX = pos.x;
        const currentY = pos.y;
        
        // رسم الخط
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(currentX, currentY);
        ctx.stroke();
        
        [lastX, lastY] = [currentX, currentY];
        
        e.preventDefault();
    }
    
    function stopDraw() {
        if (isDrawing) {
            isDrawing = false;
            saveState();
        }
    }
    
    // الحصول على إحداثيات في اللوحة (Fixed for mobile)
    function getCanvasPosition(e) {
        const rect = canvas.getBoundingClientRect();
        let clientX, clientY;
        
        if (e.type.includes('touch')) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        
        const dpr = window.devicePixelRatio || 1;
        
        return {
            x: (clientX - rect.left) * (canvas.width / rect.width / dpr),
            y: (clientY - rect.top) * (canvas.height / rect.height / dpr)
        };
    }
    
    // معالجة النقر على اللوحة
    function handleCanvasClick(e) {
        const pos = getCanvasPosition(e);
        
        if (currentMode === 'type') {
            // التحقق إذا كان النقر على نص موجود
            const clickedText = getTextAtPosition(pos.x, pos.y);
            
            if (clickedText) {
                // تحديد النص
                if (selectedTextElement) {
                    selectedTextElement.selected = false;
                }
                clickedText.selected = true;
                selectedTextElement = clickedText;
                redrawTextElements();
                
                // إلغاء وضع الإضافة إذا كان نشطاً
                isAddingText = false;
                hideTextCursor();
                
                // إظهار لوحة المفاتيح للتعديل
                if (textInput) {
                    textInput.value = clickedText.content;
                    textInput.focus();
                }
            } else {
                // إلغاء تحديد أي نص
                if (selectedTextElement) {
                    selectedTextElement.selected = false;
                    selectedTextElement = null;
                    redrawTextElements();
                }
                
                // بدء إضافة نص جديد
                startAddingText(pos.x, pos.y);
            }
        }
        
        e.preventDefault();
    }
    
    // إنشاء لوحة مفاتيح افتراضية
    function createVirtualKeyboard() {
        if (!keyboardKeys) return;
        
        const arabicKeys = [
            ['ض', 'ص', 'ث', 'ق', 'ف', 'غ', 'ع', 'ه', 'خ', 'ح', 'ج', 'د'],
            ['ش', 'س', 'ي', 'ب', 'ل', 'ا', 'ت', 'ن', 'م', 'ك', 'ط', 'ذ'],
            ['ء', 'ئ', 'ؤ', 'ر', 'ى', 'ة', 'و', 'ز', 'ظ', ' ', '⌫']
        ];
        
        keyboardKeys.innerHTML = '';
        
        arabicKeys.forEach(row => {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'keyboard-row';
            
            row.forEach(key => {
                const keyBtn = document.createElement('button');
                keyBtn.className = 'keyboard-key';
                keyBtn.type = 'button'; // Important for forms
                
                if (key === ' ') {
                    keyBtn.className += ' space';
                    keyBtn.textContent = 'مسافة';
                } else if (key === '⌫') {
                    keyBtn.className += ' backspace';
                    keyBtn.innerHTML = '<i class="fas fa-backspace"></i>';
                } else {
                    keyBtn.textContent = key;
                }
                
                keyBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (key === '⌫') {
                        textInput.value = textInput.value.slice(0, -1);
                    } else if (key === ' ') {
                        textInput.value += ' ';
                    } else {
                        textInput.value += key;
                    }
                    textInput.focus();
                });
                
                // Touch events for better mobile
                keyBtn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    keyBtn.click();
                }, { passive: false });
                
                rowDiv.appendChild(keyBtn);
            });
            
            keyboardKeys.appendChild(rowDiv);
        });
        
        // زر الإدخال
        const enterRow = document.createElement('div');
        enterRow.className = 'keyboard-row';
        
        const enterBtn = document.createElement('button');
        enterBtn.className = 'keyboard-key enter';
        enterBtn.textContent = 'إدخال';
        enterBtn.type = 'button';
        enterBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (isAddingText) {
                finishAddingText();
            }
        });
        
        enterRow.appendChild(enterBtn);
        keyboardKeys.appendChild(enterRow);
    }
    
    function showVirtualKeyboard() {
        if (virtualKeyboard) {
            virtualKeyboard.classList.add('show');
            // Scroll to show keyboard
            setTimeout(() => {
                virtualKeyboard.scrollIntoView({ behavior: 'smooth', block: 'end' });
            }, 300);
        }
    }
    
    function hideVirtualKeyboard() {
        if (virtualKeyboard) {
            virtualKeyboard.classList.remove('show');
        }
    }
    
    // إعداد مستمعي الأحداث
    function setupEventListeners() {
        // منع السلوك الافتراضي لمنع التمرير عند الرسم
        function preventDefault(e) {
            if (currentMode === 'draw' || e.target === canvas) {
                e.preventDefault();
            }
        }
        
        // منع سلوكات اللمس غير المرغوب فيها
        document.addEventListener('touchmove', preventDefault, { passive: false });
        document.addEventListener('touchstart', preventDefault, { passive: false });
        
        // أحداث الفأرة واللمس الموحدة
        canvas.addEventListener('mousedown', handleCanvasDown);
        canvas.addEventListener('mousemove', handleCanvasMove);
        canvas.addEventListener('mouseup', handleCanvasUp);
        canvas.addEventListener('mouseleave', handleCanvasUp);
        
        canvas.addEventListener('touchstart', handleCanvasDown, { passive: false });
        canvas.addEventListener('touchmove', handleCanvasMove, { passive: false });
        canvas.addEventListener('touchend', handleCanvasUp);
        canvas.addEventListener('touchcancel', handleCanvasUp);
        
        function handleCanvasDown(e) {
            const pos = getCanvasPosition(e);
            
            if (currentMode === 'draw') {
                startDraw(e);
            } else {
                // Check if clicking on existing text
                const clickedText = getTextAtPosition(pos.x, pos.y);
                
                if (clickedText && clickedText.id === selectedTextElement?.id) {
                    isDraggingText = true;
                    dragStartX = pos.x - clickedText.x;
                    dragStartY = pos.y - clickedText.y;
                } else {
                    handleCanvasClick(e);
                }
            }
        }
        
        function handleCanvasMove(e) {
            if (currentMode === 'draw') {
                draw(e);
            } else if (isDraggingText && selectedTextElement) {
                const pos = getCanvasPosition(e);
                moveTextElement(selectedTextElement, pos.x - dragStartX, pos.y - dragStartY);
            }
        }
        
        function handleCanvasUp() {
            if (currentMode === 'draw') {
                stopDraw();
            } else if (isDraggingText) {
                isDraggingText = false;
                saveState();
            }
        }
        
        // تبديل الوضع
        const drawModeBtn = document.getElementById('drawModeBtn');
        const typeModeBtn = document.getElementById('typeModeBtn');
        
        if (drawModeBtn) drawModeBtn.addEventListener('click', () => switchMode('draw'));
        if (typeModeBtn) typeModeBtn.addEventListener('click', () => switchMode('type'));
        
        // أدوات الرسم
        const clearBtn = document.getElementById('clearBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (confirm('هل تريد مسح اللوحة بالكامل؟')) {
                    ctx.fillStyle = '#fffcf9';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    textElements = [];
                    selectedTextElement = null;
                    saveState();
                }
            });
        }
        
        const undoBtn = document.getElementById('undoBtn');
        if (undoBtn) {
            undoBtn.addEventListener('click', () => {
                if (currentState > 0) {
                    currentState--;
                    restoreState();
                }
            });
        }
        
        const redoBtn = document.getElementById('redoBtn');
        if (redoBtn) {
            redoBtn.addEventListener('click', () => {
                if (currentState < history.length - 1) {
                    currentState++;
                    restoreState();
                }
            });
        }
        
        const colorPicker = document.getElementById('colorPicker');
        if (colorPicker) {
            colorPicker.addEventListener('input', (e) => {
                currentColor = e.target.value;
                ctx.strokeStyle = currentColor;
                ctx.fillStyle = currentColor;
                
                // تحديث لون النص المحدد
                if (selectedTextElement) {
                    selectedTextElement.color = currentColor;
                    redrawTextElements();
                }
            });
        }
        
        const brushSize = document.getElementById('brushSize');
        if (brushSize) {
            brushSize.addEventListener('input', (e) => {
                currentBrushSize = parseInt(e.target.value);
                ctx.lineWidth = currentBrushSize;
                const brushSizeValue = document.getElementById('brushSizeValue');
                if (brushSizeValue) {
                    brushSizeValue.textContent = currentBrushSize + ' بكسل';
                }
            });
        }
        
        // أدوات الكتابة
        const fontFamily = document.getElementById('fontFamily');
        if (fontFamily) {
            fontFamily.addEventListener('change', (e) => {
                currentFontFamily = e.target.value;
                if (selectedTextElement) {
                    selectedTextElement.fontFamily = currentFontFamily;
                    redrawTextElements();
                }
            });
        }
        
        const fontSize = document.getElementById('fontSize');
        if (fontSize) {
            fontSize.addEventListener('input', (e) => {
                currentFontSize = parseInt(e.target.value);
                const fontSizeValue = document.getElementById('fontSizeValue');
                if (fontSizeValue) {
                    fontSizeValue.textContent = currentFontSize + ' بكسل';
                }
                
                if (selectedTextElement) {
                    selectedTextElement.fontSize = currentFontSize;
                    redrawTextElements();
                }
            });
        }
        
        // أزرار المحاذاة
        document.querySelectorAll('.align-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                currentTextAlign = btn.dataset.align;
                
                // تحديث الأزرار النشطة
                document.querySelectorAll('.align-btn').forEach(b => {
                    b.classList.toggle('active', b.dataset.align === currentTextAlign);
                });
                
                if (selectedTextElement) {
                    selectedTextElement.align = currentTextAlign;
                    redrawTextElements();
                }
            });
        });
        
        // إضافة نص جديد
        const addTextBtn = document.getElementById('addTextBtn');
        if (addTextBtn) {
            addTextBtn.addEventListener('click', () => {
                const container = document.querySelector('.canvas-container');
                const rect = container.getBoundingClientRect();
                startAddingText(rect.width / 2, rect.height / 2);
            });
        }
        
        // تعديل نص
        const editTextBtn = document.getElementById('editTextBtn');
        if (editTextBtn) {
            editTextBtn.addEventListener('click', () => {
                if (selectedTextElement) {
                    if (textInput) {
                        textInput.value = selectedTextElement.content;
                        textInput.focus();
                    }
                    showVirtualKeyboard();
                } else {
                    alert('الرجاء تحديد نص للتعديل');
                }
            });
        }
        
        // حذف نص
        const deleteTextBtn = document.getElementById('deleteTextBtn');
        if (deleteTextBtn) {
            deleteTextBtn.addEventListener('click', () => {
                if (selectedTextElement) {
                    if (confirm('هل تريد حذف النص المحدد؟')) {
                        deleteSelectedText();
                    }
                } else {
                    alert('الرجاء تحديد نص للحذف');
                }
            });
        }
        
        // إدخال النص
        const confirmTextBtn = document.getElementById('confirmTextBtn');
        if (confirmTextBtn) {
            confirmTextBtn.addEventListener('click', () => {
                if (isAddingText) {
                    finishAddingText();
                } else if (selectedTextElement && textInput) {
                    updateTextElement(selectedTextElement, textInput.value.trim());
                    textInput.value = '';
                    hideVirtualKeyboard();
                }
            });
        }
        
        const cancelTextBtn = document.getElementById('cancelTextBtn');
        if (cancelTextBtn) {
            cancelTextBtn.addEventListener('click', cancelAddingText);
        }
        
        // إدخال النص بالمفتاح Enter
        if (textInput) {
            textInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (confirmTextBtn) confirmTextBtn.click();
                }
            });
            
            textInput.addEventListener('focus', () => {
                if (isMobile()) {
                    showVirtualKeyboard();
                }
            });
        }
        
        // حفظ الرسمة
        const saveBtn = document.getElementById('saveBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                // إنشاء نسخة من الكانفاس مع DPR صحيح
                const tempCanvas = document.createElement('canvas');
                const tempCtx = tempCanvas.getContext('2d');
                const dpr = window.devicePixelRatio || 1;
                
                tempCanvas.width = canvas.width;
                tempCanvas.height = canvas.height;
                tempCtx.drawImage(canvas, 0, 0);
                
                // إضافة النصوص
                textElements.forEach(text => {
                    tempCtx.save();
                    tempCtx.font = `${text.fontSize * dpr}px ${text.fontFamily}`;
                    tempCtx.fillStyle = text.color;
                    tempCtx.textAlign = text.align;
                    tempCtx.textBaseline = 'top';
                    tempCtx.fillText(text.content, text.x * dpr, text.y * dpr);
                    tempCtx.restore();
                });
                
                const link = document.createElement('a');
                const date = new Date().toLocaleDateString('ar-SA');
                link.download = `رسمة-${date}.png`;
                link.href = tempCanvas.toDataURL('image/png');
                link.click();
            });
        }
        
        // لوحة المفاتيح الافتراضية
        const closeKeyboardBtn = document.getElementById('closeKeyboardBtn');
        if (closeKeyboardBtn) {
            closeKeyboardBtn.addEventListener('click', hideVirtualKeyboard);
        }
        
        // إغلاق لوحة المفاتيح عند النقر خارجها
        document.addEventListener('touchstart', (e) => {
            if (virtualKeyboard && 
                !virtualKeyboard.contains(e.target) && 
                e.target !== textInput) {
                hideVirtualKeyboard();
            }
        });
        
        // تغيير حجم النافذة
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                const imgData = canvas.toDataURL();
                setupCanvas();
                
                const img = new Image();
                img.onload = () => {
                    ctx.drawImage(img, 0, 0);
                    redrawTextElements();
                };
                img.src = imgData;
            }, 250);
        });
        
        // منع تمرير الصفحة عند استخدام الكانفاس على الهاتف
        document.addEventListener('touchmove', function(e) {
            if (e.target === canvas || e.target.closest('.canvas-container')) {
                e.preventDefault();
            }
        }, { passive: false });
        
        // إضافة event listener لللمس على الأزرار لمنع التمرير
        document.querySelectorAll('.btn, .mode-btn, .keyboard-key').forEach(button => {
            button.addEventListener('touchstart', function(e) {
                e.stopPropagation();
            }, { passive: true });
        });
    }
    
    // التهيئة
    function initialize() {
        setupCanvas();
        saveState();
        switchMode('draw');
        setupEventListeners();
        createVirtualKeyboard();
        
        // إضافة رسالة ترحيبية
        setTimeout(() => {
            const container = document.querySelector('.canvas-container');
            const rect = container.getBoundingClientRect();
            
            ctx.fillStyle = '#ac6d2a';
            ctx.font = 'bold 26px "Noto Sans Arabic", Arial';
            
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('مرحباً! ابدأ الرسم أو الكتابة', rect.width / 2, rect.height / 2);
            
            ctx.fillStyle = '#8a5c32';
            ctx.font = '16px "Noto Sans Arabic", Arial';
            ctx.fillText('استخدم الأزرار أعلى للتبديل بين وضعي الرسم والكتابة', rect.width / 2, rect.height / 2 + 40);
            
            ctx.fillStyle = '#8a5c32';
            ctx.font = '14px "Noto Sans Arabic", Arial';
            ctx.fillText('اضغط على مسح للبدأ', rect.width / 2, rect.height / 2 + 80);
            
            saveState();
        }, 100);
        
        // تحديث القيم الأولية
        const brushSizeValue = document.getElementById('brushSizeValue');
        const fontSizeValue = document.getElementById('fontSizeValue');
        
        if (brushSizeValue) brushSizeValue.textContent = currentBrushSize + ' بكسل';
        if (fontSizeValue) fontSizeValue.textContent = currentFontSize + ' بكسل';
    }
    
    // بدء التطبيق
    initialize();
});