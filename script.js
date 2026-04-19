// 字帖生成器主程序 - 优化版（A4 自适应、诗句排版、书法字体）
document.addEventListener('DOMContentLoaded', function() {
    // 获取 DOM 元素
    const contentInput = document.getElementById('content');
    const gridTypeSelect = document.getElementById('gridType');
    const fontFamilySelect = document.getElementById('fontFamily');
    const fontSizeInput = document.getElementById('fontSize');
    const fontSizeValue = document.getElementById('fontSizeValue');
    const gridSizeManualInput = document.getElementById('gridSizeManual');
    const gridSizeManualValue = document.getElementById('gridSizeManualValue');
    const rowsSelect = document.getElementById('rows');
    const colsSelect = document.getElementById('cols');
    const layoutModeSelect = document.getElementById('layoutMode');
    const showExampleCheckbox = document.getElementById('showExample');
    const repeatContentCheckbox = document.getElementById('repeatContent');
    const autoLayoutCheckbox = document.getElementById('autoLayout');
    const pageTitleInput = document.getElementById('pageTitle');
    const generateBtn = document.getElementById('generateBtn');
    const printBtn = document.getElementById('printBtn');
    const gridContainer = document.getElementById('gridContainer');
    const worksheetTitle = document.getElementById('worksheetTitle');

    // 本地存储键名
    const STORAGE_KEY = 'zitie_generator_settings';

    // 加载保存的设置
    function loadSettings() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const settings = JSON.parse(saved);
                
                // 恢复各个控件的值
                if (settings.content) contentInput.value = settings.content;
                if (settings.gridType) gridTypeSelect.value = settings.gridType;
                if (settings.fontFamily) fontFamilySelect.value = settings.fontFamily;
                if (settings.fontSize) {
                    fontSizeInput.value = settings.fontSize;
                    fontSizeValue.textContent = settings.fontSize + '%';
                }
                if (settings.gridSizeManual) {
                    gridSizeManualInput.value = settings.gridSizeManual;
                    gridSizeManualValue.textContent = settings.gridSizeManual > 0 ? settings.gridSizeManual + 'mm' : '自动';
                }
                if (settings.rows) rowsSelect.value = settings.rows;
                if (settings.cols) colsSelect.value = settings.cols;
                if (settings.layoutMode) layoutModeSelect.value = settings.layoutMode;
                if (settings.showExample !== undefined) showExampleCheckbox.checked = settings.showExample;
                if (settings.repeatContent !== undefined) repeatContentCheckbox.checked = settings.repeatContent;
                if (settings.autoLayout !== undefined) autoLayoutCheckbox.checked = settings.autoLayout;
                if (settings.pageTitle) pageTitleInput.value = settings.pageTitle;
            }
        } catch (e) {
            console.error('加载设置失败:', e);
        }
    }

    // 保存设置
    function saveSettings() {
        try {
            const settings = {
                content: contentInput.value,
                gridType: gridTypeSelect.value,
                fontFamily: fontFamilySelect.value,
                fontSize: fontSizeInput.value,
                gridSizeManual: gridSizeManualInput.value,
                rows: rowsSelect.value,
                cols: colsSelect.value,
                layoutMode: layoutModeSelect.value,
                showExample: showExampleCheckbox.checked,
                repeatContent: repeatContentCheckbox.checked,
                autoLayout: autoLayoutCheckbox.checked,
                pageTitle: pageTitleInput.value
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        } catch (e) {
            console.error('保存设置失败:', e);
        }
    }

    // A4纸张尺寸（毫米）
    const A4_WIDTH = 210;
    const A4_HEIGHT = 297;
    const PAGE_PADDING = 20; // 页面边距

    // 字体映射表（系统字体回退）
    const fontFallbackMap = {
        'XingKai': '"STXingkai", "XingKai", "KaiTi", cursive',
        'OuTi': '"Ouyang Xun Ti", "OuTi", "KaiTi", serif',
        'YanTi': '"Yan Zhenqing Ti", "YanTi", "KaiTi", serif',
        'LiuTi': '"Liu Gongquan Ti", "LiuTi", "KaiTi", serif',
        'ZhaoTi': '"Zhao Mengfu Ti", "ZhaoTi", "KaiTi", serif',
        'ShuTi': '"Shoujin Ti", "ShuTi", "KaiTi", serif',
        'KaiTi': '"KaiTi", "STKaiti", "BiauKai", serif',
        'SimSun': '"SimSun", "STSong", "Songti SC", serif',
        'SimHei': '"SimHei", "STHeiti", "Heiti SC", sans-serif',
        'FangSong': '"FangSong", "STFangsong", "Fangsong SC", serif',
        'LiSu': '"LiSu", "STLiti", "LiSu SC", cursive',
        'YouYuan': '"YouYuan", "STYuan", "Yuanti SC", sans-serif'
    };

    // 更新字号比例显示
    function updateFontSizeDisplay() {
        fontSizeValue.textContent = fontSizeInput.value + '%';
    }

    // 更新格子大小显示
    function updateGridSizeManualDisplay() {
        const val = parseInt(gridSizeManualInput.value);
        gridSizeManualValue.textContent = val > 0 ? val + 'mm' : '自动';
    }

    fontSizeInput.addEventListener('input', updateFontSizeDisplay);
    gridSizeManualInput.addEventListener('input', updateGridSizeManualDisplay);

    // 预设格子大小表（根据列数自动计算，适配A4宽度170mm）
    // A4可用宽度约170mm，减去间距后计算格子大小
    const presetGridSizes = {
        1: 160,  // 1字每行，大字练习
        2: 80,   // 2字每行
        3: 55,   // 3字每行
        4: 40,   // 4字每行
        5: 32,   // 5字每行
        6: 26,   // 6字每行
        7: 22,   // 7字每行（七言）
        8: 19,   // 8字每行
        9: 17,   // 9字每行
        10: 15,  // 10字每行
        11: 14,  // 11字每行
        12: 12,  // 12字每行
        13: 11,  // 13字每行
        14: 10,  // 14字每行
        15: 10,  // 15字每行
        16: 9,   // 16字每行
        17: 9,   // 17字每行
        18: 8,   // 18字每行
        19: 8,   // 19字每行
        20: 7    // 20字每行
    };

    // 计算格子大小（支持手动覆盖）
    function calculateGridSize(cols, rows, autoLayout, gridSizeManual) {
        // 如果手动设置了格子大小，直接使用
        if (gridSizeManual > 0) {
            const gap = gridSizeManual >= 30 ? 5 : 3;
            return { gridSize: gridSizeManual, gap };
        }

        // 使用预设格子大小
        const gridSize = presetGridSizes[cols] || 18;
        const gap = cols <= 5 ? 5 : 3;

        return { gridSize, gap };
    }

    // 创建单个字格
    function createCharacterCell(char, gridType, fontFamily, fontSizePercent, gridSize, showExample) {
        const cell = document.createElement('div');
        cell.className = `character-cell ${gridType}`;
        cell.style.width = gridSize + 'mm';
        cell.style.height = gridSize + 'mm';

        // 添加米字格的对角线
        if (gridType === 'mizi') {
            const diagonal1 = document.createElement('div');
            diagonal1.className = 'diagonal-1';
            const diagonal2 = document.createElement('div');
            diagonal2.className = 'diagonal-2';
            cell.appendChild(diagonal1);
            cell.appendChild(diagonal2);
        }

        // 计算实际字号（格子大小的百分比）
        const actualFontSize = Math.floor(gridSize * (fontSizePercent / 100));

        // 获取字体（带回退）
        const fontStack = fontFallbackMap[fontFamily] || fontFamily;

        // 添加描红示例字
        if (showExample && char) {
            const exampleChar = document.createElement('span');
            exampleChar.className = 'example-char';
            exampleChar.textContent = char;
            exampleChar.style.fontFamily = fontStack;
            exampleChar.style.fontSize = actualFontSize + 'mm';
            cell.appendChild(exampleChar);
        }

        // 添加练习字（空心描红）
        if (char) {
            const practiceChar = document.createElement('span');
            practiceChar.className = 'practice-char';
            practiceChar.textContent = char;
            practiceChar.style.fontFamily = fontStack;
            practiceChar.style.fontSize = actualFontSize + 'mm';
            cell.appendChild(practiceChar);
        }

        return cell;
    }

    // 解析输入内容（支持两种模式）
    function parseContent(content, layoutMode) {
        if (!content.trim()) {
            return [['请', '输', '入', '练', '习', '内', '容']];
        }

        // 按行分割
        const lines = content.split('\n').filter(line => line.trim());

        if (lines.length === 0) {
            return [['请', '输', '入', '练', '习', '内', '容']];
        }

        if (layoutMode === 'poem') {
            // 诗词格式：每行独立，第一行（标题）居中，其他行顶格
            return lines.map((line, index) => {
                const chars = line.trim().replace(/\s/g, '').split('');
                if (index === 0) {
                    // 第一行是标题，标记为居中
                    return { chars, align: 'center' };
                } else {
                    // 其他行顶格
                    return { chars, align: 'left' };
                }
            });
        } else {
            // 散文格式：所有字连在一起
            const allChars = [];
            lines.forEach(line => {
                const chars = line.trim().replace(/\s/g, '').split('');
                chars.forEach(char => {
                    allChars.push(char);
                });
            });
            return allChars;
        }
    }

    // 将所有诗句合并为一个字符数组（用于循环重复）
    function flattenContent(contentLines) {
        return contentLines; // 已经是扁平数组
    }

    // 填充行内容到指定列数
    function fillLine(chars, cols, fillMode) {
        const result = [];
        if (chars.length === 0) {
            return new Array(cols).fill('');
        }

        if (fillMode === 'repeat') {
            // 重复模式：循环填充
            for (let i = 0; i < cols; i++) {
                result.push(chars[i % chars.length]);
            }
        } else if (fillMode === 'extend') {
            // 延展模式：诗句显示完后，最后一个字循环（适合单字练习）
            for (let i = 0; i < cols; i++) {
                if (i < chars.length) {
                    result.push(chars[i]);
                } else {
                    result.push(chars[chars.length - 1]); // 重复最后一个字
                }
            }
        } else {
            // 默认模式：只显示原有字符，剩余留空
            for (let i = 0; i < cols; i++) {
                result.push(chars[i] || '');
            }
        }

        return result;
    }

    // 生成字帖
    function generateWorksheet() {
        const content = contentInput.value;
        const gridType = gridTypeSelect.value;
        const fontFamily = fontFamilySelect.value;
        const fontSizePercent = parseInt(fontSizeInput.value);
        const gridSizeManual = parseInt(gridSizeManualInput.value);
        const rows = parseInt(rowsSelect.value);
        const cols = parseInt(colsSelect.value);
        const layoutMode = layoutModeSelect.value;
        const showExample = showExampleCheckbox.checked;
        const repeatContent = repeatContentCheckbox.checked;
        const autoLayout = autoLayoutCheckbox.checked;
        const pageTitle = pageTitleInput.value.trim();

        // 清空容器
        gridContainer.innerHTML = '';

        // 设置标题
        worksheetTitle.textContent = pageTitle;

        // 计算格子大小
        const { gridSize, gap } = calculateGridSize(cols, rows, autoLayout, gridSizeManual);

        // 设置容器间距
        gridContainer.style.gap = gap + 'mm';

        // 解析内容（根据排版模式）
        const contentData = parseContent(content, layoutMode);

        // 生成每一行
        for (let row = 0; row < rows; row++) {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'grid-row';
            rowDiv.style.gap = gap + 'mm';

            let rowChars = [];
            let textAlign = 'left';

            if (layoutMode === 'poem') {
                // 诗词格式：每行对应，支持循环重复
                if (repeatContent) {
                    // 循环模式：计算当前行在循环中的位置
                    const totalRows = contentData.length;
                    const cycleRow = row % totalRows;
                    rowChars = contentData[cycleRow].chars;
                    textAlign = contentData[cycleRow].align;
                } else {
                    // 不循环：只显示原有行，超出留空
                    if (row < contentData.length) {
                        rowChars = contentData[row].chars;
                        textAlign = contentData[row].align;
                    }
                }
            } else {
                // 散文格式：连续排版，支持循环重复
                if (repeatContent) {
                    // 循环模式
                    const totalChars = contentData.length;
                    const startIndex = row * cols;
                    for (let col = 0; col < cols; col++) {
                        const charIndex = (startIndex + col) % totalChars;
                        rowChars.push(contentData[charIndex]);
                    }
                } else {
                    // 不循环：连续显示，超出留空
                    const startIndex = row * cols;
                    for (let col = 0; col < cols; col++) {
                        const charIndex = startIndex + col;
                        if (charIndex < contentData.length) {
                            rowChars.push(contentData[charIndex]);
                        }
                    }
                }
            }

            // 创建每个字格
            for (let col = 0; col < cols; col++) {
                let char = '';
                let showChar = false;

                if (layoutMode === 'poem') {
                    // 诗词格式：计算居中的起始位置
                    if (textAlign === 'center') {
                        // 标题行：计算居中起始位置
                        const totalChars = rowChars.length;
                        const emptySlots = cols - totalChars;
                        const startSlot = Math.floor(emptySlots / 2);
                        
                        // 如果当前列在字符范围内
                        if (col >= startSlot && col < startSlot + totalChars) {
                            char = rowChars[col - startSlot]; // 从第 0 个字符开始
                            showChar = true;
                        }
                    } else {
                        // 正文行：顶格显示
                        if (col < rowChars.length) {
                            char = rowChars[col];
                            showChar = true;
                        }
                    }
                } else {
                    // 散文格式：如果字符索引在范围内
                    if (col < rowChars.length) {
                        char = rowChars[col];
                        showChar = true;
                    }
                }

                const cell = createCharacterCell(char, gridType, fontFamily, fontSizePercent, gridSize, showExample);
                
                // 如果字符不显示，隐藏格子
                if (!showChar) {
                    cell.style.visibility = 'hidden';
                }
                
                rowDiv.appendChild(cell);
            }

            gridContainer.appendChild(rowDiv);
        }
    }

    // 打印功能
    function printWorksheet() {
        window.print();
    }

    // 绑定事件
    generateBtn.addEventListener('click', generateWorksheet);
    printBtn.addEventListener('click', printWorksheet);

    // 输入内容变化时自动重新生成（防抖）并保存设置
    let debounceTimer;
    contentInput.addEventListener('input', function() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            generateWorksheet();
            saveSettings();
        }, 500);
    });

    // 其他控件变化时重新生成并保存设置
    [gridTypeSelect, fontFamilySelect, layoutModeSelect, showExampleCheckbox, repeatContentCheckbox, autoLayoutCheckbox, pageTitleInput, rowsSelect, colsSelect].forEach(el => {
        el.addEventListener('change', () => {
            generateWorksheet();
            saveSettings();
        });
    });

    // 字号和格子大小滑块变化时重新生成并保存设置
    fontSizeInput.addEventListener('change', () => {
        generateWorksheet();
        saveSettings();
    });
    gridSizeManualInput.addEventListener('change', () => {
        generateWorksheet();
        saveSettings();
    });

    // 初始化
    loadSettings();  // 加载保存的设置
    updateFontSizeDisplay();
    updateGridSizeManualDisplay();
    generateWorksheet();
});
