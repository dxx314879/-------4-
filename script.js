// 全局变量
let currentUser = '';
let currentChatUser = '';
let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
let users = JSON.parse(localStorage.getItem('users')) || [];
let messages = JSON.parse(localStorage.getItem('messages')) || {};

// DOM 元素
const usernameInput = document.getElementById('username');
const setUsernameBtn = document.getElementById('setUsername');
const currentUserSpan = document.getElementById('currentUser');
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const taskTitleInput = document.getElementById('taskTitle');
const taskContentInput = document.getElementById('taskContent');
const addTaskBtn = document.getElementById('addTask');
const tasksList = document.getElementById('tasksList');
const searchUserInput = document.getElementById('searchUser');
const usersList = document.getElementById('usersList');
const chatWithSpan = document.getElementById('chatWith');
const closeChatBtn = document.getElementById('closeChat');
const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const sendMessageBtn = document.getElementById('sendMessage');
const taskModal = document.getElementById('taskModal');
const modalTitle = document.getElementById('modalTitle');
const modalContent = document.getElementById('modalContent');
const closeModalBtn = document.getElementById('closeModal');
const completeTaskBtn = document.getElementById('completeTask');
const deleteTaskBtn = document.getElementById('deleteTask');

// 当前选中的任务
let selectedTask = null;

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    loadData();
    renderTasks();
    renderUsers();
});

// 初始化应用
function initializeApp() {
    // 检查是否有保存的用户名
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = savedUser;
        currentUserSpan.textContent = `当前用户: ${currentUser}`;
        usernameInput.value = currentUser;
    }
}

// 设置事件监听器
function setupEventListeners() {
    // 用户名设置
    setUsernameBtn.addEventListener('click', setUsername);
    usernameInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            setUsername();
        }
    });

    // 标签切换
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tab = this.dataset.tab;
            switchTab(tab);
        });
    });

    // 任务管理
    addTaskBtn.addEventListener('click', addTask);
    taskContentInput.addEventListener('keypress', function(e) {
        if (e.ctrlKey && e.key === 'Enter') {
            addTask();
        }
    });

    // 聊天功能
    searchUserInput.addEventListener('input', filterUsers);
    sendMessageBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    closeChatBtn.addEventListener('click', closeChat);

    // 模态框
    closeModalBtn.addEventListener('click', closeModal);
    completeTaskBtn.addEventListener('click', completeTask);
    deleteTaskBtn.addEventListener('click', deleteTask);
    window.addEventListener('click', function(e) {
        if (e.target === taskModal) {
            closeModal();
        }
    });
}

// 设置用户名
function setUsername() {
    const username = usernameInput.value.trim();
    if (!username) {
        alert('请输入用户名');
        return;
    }
    
    currentUser = username;
    currentUserSpan.textContent = `当前用户: ${currentUser}`;
    localStorage.setItem('currentUser', currentUser);
    
    // 添加到用户列表（如果不存在）
    if (!users.includes(currentUser)) {
        users.push(currentUser);
        saveUsers();
        renderUsers();
    }
    
    showNotification('用户名设置成功！', 'success');
}

// 切换标签
function switchTab(tabName) {
    // 更新标签按钮状态
    tabBtns.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
        }
    });

    // 更新标签内容
    tabContents.forEach(content => {
        content.classList.remove('active');
        if (content.id === `${tabName}-tab`) {
            content.classList.add('active');
        }
    });

    // 如果切换到聊天标签，刷新用户列表
    if (tabName === 'chat') {
        renderUsers();
    }
}

// 添加任务
function addTask() {
    if (!currentUser) {
        alert('请先设置用户名');
        return;
    }

    const title = taskTitleInput.value.trim();
    const content = taskContentInput.value.trim();

    if (!title) {
        alert('请输入任务标题');
        return;
    }

    const task = {
        id: Date.now().toString(),
        title: title,
        content: content,
        author: currentUser,
        status: 'pending',
        createdAt: new Date().toISOString(),
        completedAt: null
    };

    tasks.push(task);
    saveTasks();
    renderTasks();
    
    // 清空表单
    taskTitleInput.value = '';
    taskContentInput.value = '';
    
    showNotification('任务发布成功！', 'success');
}

// 渲染任务列表
function renderTasks() {
    if (!tasksList) return;

    // 过滤掉已完成的任务
    const pendingTasks = tasks.filter(task => task.status === 'pending');
    
    if (pendingTasks.length === 0) {
        tasksList.innerHTML = '<div class="no-tasks">暂无任务</div>';
        return;
    }

    tasksList.innerHTML = pendingTasks.map(task => `
        <div class="task-item" onclick="openTaskModal('${task.id}')">
            <div class="task-header">
                <div>
                    <div class="task-title">${escapeHtml(task.title)}</div>
                    <div class="task-author">发布者: ${escapeHtml(task.author)}</div>
                </div>
                <div class="task-status ${task.status}">${task.status === 'pending' ? '进行中' : '已完成'}</div>
            </div>
            <div class="task-content">${escapeHtml(task.content)}</div>
            <div class="task-meta">
                <span>发布时间: ${formatDate(task.createdAt)}</span>
                ${task.author === currentUser ? '<span style="color: #667eea;">我的任务</span>' : ''}
            </div>
        </div>
    `).join('');
}

// 打开任务详情模态框
function openTaskModal(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    selectedTask = task;
    modalTitle.textContent = task.title;
    modalContent.innerHTML = `
        <div class="task-detail">
            <div class="task-author">发布者: ${escapeHtml(task.author)}</div>
            <div class="task-content" style="margin: 15px 0; padding: 15px; background: #f8fafc; border-radius: 8px;">
                ${escapeHtml(task.content)}
            </div>
            <div class="task-meta">
                <div>发布时间: ${formatDate(task.createdAt)}</div>
                <div>状态: <span class="task-status ${task.status}">${task.status === 'pending' ? '进行中' : '已完成'}</span></div>
            </div>
        </div>
    `;

    // 只有任务发布者可以管理任务
    if (task.author === currentUser) {
        completeTaskBtn.style.display = task.status === 'pending' ? 'inline-block' : 'none';
        deleteTaskBtn.style.display = 'inline-block';
    } else {
        completeTaskBtn.style.display = 'none';
        deleteTaskBtn.style.display = 'none';
    }

    taskModal.style.display = 'block';
}

// 关闭模态框
function closeModal() {
    taskModal.style.display = 'none';
    selectedTask = null;
}

// 完成任务
function completeTask() {
    if (!selectedTask) return;

    selectedTask.status = 'completed';
    selectedTask.completedAt = new Date().toISOString();
    saveTasks();
    renderTasks();
    closeModal();
    showNotification('任务已完成！', 'success');
}

// 删除任务
function deleteTask() {
    if (!selectedTask) return;

    if (confirm('确定要删除这个任务吗？')) {
        tasks = tasks.filter(t => t.id !== selectedTask.id);
        saveTasks();
        renderTasks();
        closeModal();
        showNotification('任务已删除！', 'success');
    }
}

// 渲染用户列表
function renderUsers() {
    if (!usersList) return;

    const filteredUsers = users.filter(user => 
        user !== currentUser && 
        user.toLowerCase().includes(searchUserInput.value.toLowerCase())
    );

    if (filteredUsers.length === 0) {
        usersList.innerHTML = '<div class="no-users">暂无其他用户</div>';
        return;
    }

    usersList.innerHTML = filteredUsers.map(user => `
        <div class="user-item" onclick="startChat('${escapeHtml(user)}')">
            <span>👤</span>
            <span>${escapeHtml(user)}</span>
        </div>
    `).join('');
}

// 过滤用户
function filterUsers() {
    renderUsers();
}

// 开始聊天
function startChat(username) {
    currentChatUser = username;
    chatWithSpan.textContent = `正在与 ${username} 聊天`;
    
    // 更新用户列表中的选中状态
    document.querySelectorAll('.user-item').forEach(item => {
        item.classList.remove('active');
        if (item.textContent.includes(username)) {
            item.classList.add('active');
        }
    });

    renderChatMessages();
    messageInput.focus();
}

// 关闭聊天
function closeChat() {
    currentChatUser = '';
    chatWithSpan.textContent = '选择一个用户开始聊天';
    chatMessages.innerHTML = '';
    messageInput.value = '';
    
    // 清除用户列表中的选中状态
    document.querySelectorAll('.user-item').forEach(item => {
        item.classList.remove('active');
    });
}

// 发送消息
function sendMessage() {
    if (!currentUser) {
        alert('请先设置用户名');
        return;
    }

    if (!currentChatUser) {
        alert('请先选择一个聊天对象');
        return;
    }

    const content = messageInput.value.trim();
    if (!content) return;

    const message = {
        id: Date.now().toString(),
        from: currentUser,
        to: currentChatUser,
        content: content,
        timestamp: new Date().toISOString()
    };

    // 保存消息
    const chatKey = getChatKey(currentUser, currentChatUser);
    if (!messages[chatKey]) {
        messages[chatKey] = [];
    }
    messages[chatKey].push(message);
    saveMessages();

    // 清空输入框
    messageInput.value = '';

    // 重新渲染消息
    renderChatMessages();
}

// 渲染聊天消息
function renderChatMessages() {
    if (!currentChatUser) return;

    const chatKey = getChatKey(currentUser, currentChatUser);
    const chatMessages_list = messages[chatKey] || [];

    if (chatMessages_list.length === 0) {
        chatMessages.innerHTML = '<div class="no-messages">开始聊天吧！</div>';
        return;
    }

    chatMessages.innerHTML = chatMessages_list.map(msg => `
        <div class="message ${msg.from === currentUser ? 'own' : 'other'}">
            <div class="message-author">${escapeHtml(msg.from)}</div>
            <div class="message-content">${escapeHtml(msg.content)}</div>
            <div class="message-time">${formatTime(msg.timestamp)}</div>
        </div>
    `).join('');

    // 滚动到底部
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 获取聊天键
function getChatKey(user1, user2) {
    return [user1, user2].sort().join('_');
}

// 数据持久化
function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

function saveUsers() {
    localStorage.setItem('users', JSON.stringify(users));
}

function saveMessages() {
    localStorage.setItem('messages', JSON.stringify(messages));
}

function loadData() {
    tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    users = JSON.parse(localStorage.getItem('users')) || [];
    messages = JSON.parse(localStorage.getItem('messages')) || {};
}

// 工具函数
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function showNotification(message, type = 'info') {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#48bb78' : '#667eea'};
        color: white;
        padding: 12px 20px;
        border-radius: 25px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        font-size: 14px;
        font-weight: 500;
        animation: slideIn 0.3s ease;
    `;

    // 添加动画样式
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);

    document.body.appendChild(notification);

    // 3秒后自动移除
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// 定期保存数据（防止数据丢失）
setInterval(() => {
    saveTasks();
    saveUsers();
    saveMessages();
}, 30000); // 每30秒保存一次
