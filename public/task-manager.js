// ==================== 任务管理功能 ====================

// 更新任务显示
function updateTaskDisplay() {
  const taskListEl = document.getElementById('taskList');
  const taskCountEl = document.getElementById('taskCount');
  
  if (!taskListEl || !taskCountEl) return;
  
  taskCountEl.textContent = `(${taskList.length})`;
  
  if (taskList.length === 0) {
    taskListEl.innerHTML = `
      <div style="text-align: center; color: #999; padding: 40px 20px;">
        <div style="font-size: 3rem; margin-bottom: 10px;">📋</div>
        <div>暂无任务</div>
        <div style="font-size: 0.85rem; margin-top: 8px;">任务将从汇总和洞察中自动提取</div>
      </div>
    `;
    return;
  }
  
  const tasksHTML = taskList.map((task, index) => {
    const timestamp = new Date(task.timestamp).toLocaleString('zh-CN');
    const checkedClass = task.completed ? 'style="text-decoration: line-through; opacity: 0.6;"' : '';
    
    return `
      <div class="task-item" style="padding: 12px; background: white; border-radius: 8px; margin-bottom: 8px; border-left: 4px solid ${task.completed ? '#999' : '#667eea'}; transition: all 0.3s;">
        <div style="display: flex; align-items: start; gap: 10px;">
          <input type="checkbox" 
                 ${task.completed ? 'checked' : ''} 
                 onchange="toggleTaskComplete(${index})"
                 style="margin-top: 4px; cursor: pointer; width: 18px; height: 18px;">
          <div style="flex: 1;">
            <div ${checkedClass} style="font-size: 0.9rem; color: #333; line-height: 1.5; margin-bottom: 6px;">
              ${escapeHtml(task.description)}
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div style="font-size: 0.75rem; color: #999;">
                📅 ${timestamp}
                ${task.source ? ` • 来源: ${task.source}` : ''}
              </div>
              <button onclick="deleteTask(${index})" 
                      style="padding: 4px 8px; background: #ff6b6b; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.7rem; transition: all 0.2s;"
                      onmouseover="this.style.background='#ee5a6f'"
                      onmouseout="this.style.background='#ff6b6b'">删除</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  taskListEl.innerHTML = tasksHTML;
}

// HTML 转义函数
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 切换任务完成状态
function toggleTaskComplete(index) {
  if (index >= 0 && index < taskList.length) {
    taskList[index].completed = !taskList[index].completed;
    saveTasks();
    updateTaskDisplay();
  }
}

// 删除任务
function deleteTask(index) {
  if (index >= 0 && index < taskList.length) {
    if (confirm('确定要删除这个任务吗？')) {
      taskList.splice(index, 1);
      saveTasks();
      updateTaskDisplay();
    }
  }
}

// 清空所有任务
function clearAllTasks() {
  if (taskList.length === 0) {
    showSaveNotification('⚠️ 任务列表已经是空的');
    return;
  }
  
  if (confirm('确定要清空所有任务吗？')) {
    taskList = [];
    saveTasks();
    updateTaskDisplay();
    showSaveNotification('✅ 所有任务已清空');
  }
}

// 从文本中提取任务
async function extractTasksFromText(content, source = '未知') {
  try {
    const taskPromptInput = document.getElementById('taskPromptInput');
    const autoExtractCheckbox = document.getElementById('autoExtractTasksCheckbox');
    
    // 检查是否启用自动提取
    if (!autoExtractCheckbox || !autoExtractCheckbox.checked) {
      console.log('自动任务提取已禁用');
      return [];
    }
    
    const taskPrompt = taskPromptInput ? taskPromptInput.value.trim() : DEFAULT_CONFIG.taskPrompt;
    
    if (!taskPrompt) {
      console.error('任务提取提示词为空');
      return [];
    }
    
    console.log(`正在从${source}提取任务...`);
    
    // 构建当前已有任务的上下文
    let existingTasksContext = '';
    if (taskList.length > 0) {
      existingTasksContext = '\n\n【当前已有任务列表】（用于避免重复提取相同任务）\n';
      taskList.forEach((task, index) => {
        const status = task.completed ? '✅' : '⬜';
        existingTasksContext += `${index + 1}. ${status} ${task.description}`;
        if (task.source) {
          existingTasksContext += ` (来源: ${task.source})`;
        }
        existingTasksContext += '\n';
      });
      existingTasksContext += '\n请注意：如果新内容中的任务与上述已有任务重复或高度相似，请不要重复提取。只提取新的、不同的任务。\n';
    }
    
    // 调用洞察 API 提取任务
    const insightApiKeyInput = document.getElementById('insightApiKeyInput');
    const insightApiKey = insightApiKeyInput ? insightApiKeyInput.value.trim() : '';
    
    const requestHeaders = { 'Content-Type': 'application/json' };
    if (insightApiKey) {
      requestHeaders['Authorization'] = `Bearer ${insightApiKey}`;
    }
    
    const requestBody = {
      model: insightModelInput.value || 'RM-01 LLM',
      messages: [
        {
          role: 'system',
          content: taskPrompt
        },
        {
          role: 'user',
          content: existingTasksContext + '\n【待分析的新内容】\n' + content
        }
      ],
      temperature: 0.3,
      stream: false
    };
    
    const resp = await fetch(insightApiUrlInput.value, {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify(requestBody)
    });
    
    if (!resp.ok) {
      throw new Error(`HTTP error! status: ${resp.status}`);
    }
    
    const result = await resp.json();
    const responseText = result.choices?.[0]?.message?.content || '';
    
    // 解析任务列表
    const tasks = parseTasksFromResponse(responseText);
    
    if (tasks.length > 0) {
      console.log(`从${source}提取到 ${tasks.length} 个任务`);
      
      // 添加任务到列表
      tasks.forEach(description => {
        taskList.push({
          description: description,
          completed: false,
          timestamp: new Date().toISOString(),
          source: source
        });
      });
      
      saveTasks();
      updateTaskDisplay();
      
      showSaveNotification(`✅ 从${source}提取了 ${tasks.length} 个新任务`);
    } else {
      console.log(`从${source}未提取到任务`);
    }
    
    return tasks;
  } catch (err) {
    console.error('提取任务失败:', err);
    return [];
  }
}

// 从响应文本中解析任务列表
function parseTasksFromResponse(text) {
  const tasks = [];
  const lines = text.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    // 匹配 "- [ ] 任务描述" 格式
    const match = trimmed.match(/^-\s*\[\s*\]\s*(.+)$/);
    if (match && match[1]) {
      const taskDesc = match[1].trim();
      if (taskDesc && !tasks.includes(taskDesc)) {
        tasks.push(taskDesc);
      }
    }
  }
  
  return tasks;
}

// 暴露函数到全局
window.toggleTaskComplete = toggleTaskComplete;
window.deleteTask = deleteTask;
window.clearAllTasks = clearAllTasks;
window.extractTasksFromText = extractTasksFromText;
