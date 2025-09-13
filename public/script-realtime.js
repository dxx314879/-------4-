// 全局变量
let currentUser = '';
let currentChatUser = '';
let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
let users = JSON.parse(localStorage.getItem('users')) || [];
let messages = JSON.parse(localStorage.getItem('messages')) || {};
let currentFilter = 'all';
let unreadMessages = JSON.parse(localStorage.getItem('unreadMessages')) || {};
let comments = JSON.parse(localStorage.getItem('comments')) || {};
let socket = null;
let onlineUsers = [];

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
const filterBtns = document.querySelectorAll('.filter-btn');
const commentsList = document.getElementById('commentsList');
const commentInput = document.getElementById('commentInput');
const addCommentBtn = document.getElementById('addComment');

// 当前选中的任务
let selectedTask = null;

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    loadData();
    renderTasks();
    renderUsers();
    initializeSocket();
});

// 初始化Socket连接
function initializeSocket() {
    // 检查是否在Vercel环境中
    if (window.location.hostname.includes('vercel.app') || window.location.hostname === 'localhost') {
        socket = io();
        
        socket.on('connect', () => {
            console.log('Connected to server');
            if (currentUser) {
                socket.emit('user-join', { username: currentUser });
            }
        });

        socket.on('disconnect', () => {
            console.log('Disconnected from server');
        });

        // 监听在线用户更新
        socket.on('users-updated', (users) => {
            onlineUsers = users;
            renderUsers();
        });

        // 监听私聊消息
        socket.on('receive-private-message', (data) => {
            handleReceivedMessage(data);
        });

        // 监听任务更新
        socket.on('task-created', (taskData) => {
            if (taskData.author !== currentUser) {
                tasks.push(taskData);
                saveTasks();
                renderTasks();
                showNotification(`${taskData.author} 发布了新任务: ${taskData.title}`, 'info');
            }
        });

        socket.on('task-status-changed', (taskData) => {
            const taskIndex = tasks.findIndex(t => t.id === taskData.id);
            if (taskIndex !== -1) {
                tasks[taskIndex] = taskData;
                saveTasks();
                renderTasks();
                showNotification(`任务 "${taskData.title}" 状态已更新`, 'info');
            }
        });

        // 监听任务评论
        socket.on('receive-task-comment', (data) => {
            if (!comments[data.taskId]) {
                comments[data.taskId] = [];
            }
            comments[data.taskId].push({
                id: Date.now().toString(),
                taskId: data.taskId,
                author: data.author,
                content: data.comment,
                timestamp: data.timestamp
            });
            saveComments();
            
            if (selectedTask && selectedTask.id === data.taskId) {
                renderComments(data.taskId);
            }
            
            showNotification(`${data.author} 在任务中添加了评论`, 'info');
        });
    }
}

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

    // 任务筛选
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const filter = this.dataset.filter;
            setFilter(filter);
        });
    });

    // 评论功能
    addCommentBtn.addEventListener('click', addComment);
    commentInput.addEventListener('keypress', function(e) {
        if (e.ctrlKey && e.key === 'Enter') {
            addComment();
        }
    });

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
    
    // 通知服务器用户加入
    if (socket) {
        socket.emit('user-join', { username: currentUser });
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
    
    // 通知其他用户新任务
    if (socket) {
        socket.emit('new-task', task);
    }
    
    // 清空表单
    taskTitleInput.value = '';
    taskContentInput.value = '';
    
    showNotification('任务发布成功！', 'success');
}

// 设置筛选器
function setFilter(filter) {
    currentFilter = filter;
    
    // 更新筛选按钮状态
    filterBtns.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.filter === filter) {
            btn.classList.add('active');
        }
    });
    
    renderTasks();
}

// 渲染任务列表
function renderTasks() {
    if (!tasksList) return;

    // 根据筛选条件过滤任务
    let filteredTasks = tasks;
    
    switch (currentFilter) {
        case 'pending':
            filteredTasks = tasks.filter(task => task.status === 'pending');
            break;
        case 'completed':
            filteredTasks = tasks.filter(task => task.status === 'completed');
            break;
        case 'my':
            filteredTasks = tasks.filter(task => task.author === currentUser);
            break;
        case 'all':
        default:
            filteredTasks = tasks;
            break;
    }

    // 按状态和创建时间排序
    const sortedTasks = filteredTasks.sort((a, b) => {
        // 先按状态排序（进行中的在前）
        if (a.status !== b.status) {
            return a.status === 'pending' ? -1 : 1;
        }
        // 再按创建时间排序（最新的在前）
        return new Date(b.createdAt) - new Date(a.createdAt);
    });
    
    if (sortedTasks.length === 0) {
        const filterText = {
            'all': '暂无任务',
            'pending': '暂无进行中的任务',
            'completed': '暂无已完成的任务',
            'my': '暂无我的任务'
        };
        tasksList.innerHTML = `<div class="no-tasks">${filterText[currentFilter] || '暂无任务'}</div>`;
        return;
    }

    tasksList.innerHTML = sortedTasks.map(task => {
        const isOnline = onlineUsers.some(user => user.username === task.author);
        return `
            <div class="task-item ${task.status}" onclick="openTaskModal('${task.id}')">
                <div class="task-header">
                    <div>
                        <div class="task-title">${escapeHtml(task.title)}</div>
                        <div class="task-author">
                            发布者: ${escapeHtml(task.author)}
                            ${isOnline ? '<span class="online-indicator">🟢</span>' : ''}
                        </div>
                    </div>
                    <div class="task-status ${task.status}">${task.status === 'pending' ? '进行中' : '已完成'}</div>
                </div>
                <div class="task-content">${escapeHtml(task.content)}</div>
                <div class="task-meta">
                    <span>发布时间: ${formatDate(task.createdAt)}</span>
                    ${task.author === currentUser ? '<span style="color: #667eea; font-weight: 600;">我的任务</span>' : ''}
                    ${task.status === 'completed' ? `<span style="color: #48bb78;">完成时间: ${formatDate(task.completedAt)}</span>` : ''}
                </div>
            </div>
        `;
    }).join('');
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

    // 加入任务讨论房间
    if (socket) {
        socket.emit('join-task-room', taskId);
    }

    // 渲染评论
    renderComments(taskId);
    
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
    
    // 通知其他用户任务状态更新
    if (socket) {
        socket.emit('task-updated', selectedTask);
    }
    
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

    // 合并本地用户和在线用户
    const allUsers = [...new Set([...users, ...onlineUsers.map(u => u.username)])];
    
    const filteredUsers = allUsers.filter(user => 
        user !== currentUser && 
        user.toLowerCase().includes(searchUserInput.value.toLowerCase())
    );

    if (filteredUsers.length === 0) {
        usersList.innerHTML = '<div class="no-users">暂无其他用户</div>';
        return;
    }

    usersList.innerHTML = filteredUsers.map(user => {
        const unreadCount = getUnreadCount(user);
        const isOnline = onlineUsers.some(u => u.username === user);
        return `
            <div class="user-item ${currentChatUser === user ? 'active' : ''}" onclick="startChat('${escapeHtml(user)}')">
                <span>👤</span>
                <span>${escapeHtml(user)}</span>
                ${isOnline ? '<span class="online-indicator">🟢</span>' : ''}
                ${unreadCount > 0 ? `<span class="unread-badge">${unreadCount}</span>` : ''}
            </div>
        `;
    }).join('');
}

// 过滤用户
function filterUsers() {
    renderUsers();
}

// 开始聊天
function startChat(username) {
    currentChatUser = username;
    chatWithSpan.textContent = `正在与 ${username} 聊天`;
    
    // 清除未读消息计数
    clearUnreadCount(username);
    
    // 加入私聊房间
    if (socket) {
        socket.emit('join-private-chat', {
            user1: currentUser,
            user2: username
        });
    }
    
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

    // 保存消息到本地
    const chatKey = getChatKey(currentUser, currentChatUser);
    if (!messages[chatKey]) {
        messages[chatKey] = [];
    }
    messages[chatKey].push(message);
    saveMessages();

    // 通过Socket发送消息
    if (socket) {
        socket.emit('send-private-message', {
            from: currentUser,
            to: currentChatUser,
            message: content
        });
    }

    // 增加接收方的未读消息计数
    incrementUnreadCount(currentChatUser);

    // 清空输入框
    messageInput.value = '';

    // 重新渲染消息
    renderChatMessages();
    
    showNotification(`消息已发送给 ${currentChatUser}`, 'success');
}

// 处理接收到的消息
function handleReceivedMessage(data) {
    const message = {
        id: Date.now().toString(),
        from: data.from,
        to: data.to,
        content: data.message,
        timestamp: data.timestamp
    };

    // 保存消息
    const chatKey = getChatKey(data.from, data.to);
    if (!messages[chatKey]) {
        messages[chatKey] = [];
    }
    messages[chatKey].push(message);
    saveMessages();

    // 如果当前正在与此用户聊天，显示消息
    if (currentChatUser === data.from) {
        renderChatMessages();
    } else {
        // 否则增加未读计数
        incrementUnreadCount(data.from);
    }
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

// 获取未读消息数量
function getUnreadCount(user) {
    if (!currentUser) return 0;
    const chatKey = getChatKey(currentUser, user);
    return unreadMessages[chatKey] || 0;
}

// 清除未读消息计数
function clearUnreadCount(user) {
    if (!currentUser) return;
    const chatKey = getChatKey(currentUser, user);
    unreadMessages[chatKey] = 0;
    saveUnreadMessages();
    renderUsers();
}

// 增加未读消息计数
function incrementUnreadCount(user) {
    if (!currentUser) return;
    const chatKey = getChatKey(currentUser, user);
    unreadMessages[chatKey] = (unreadMessages[chatKey] || 0) + 1;
    saveUnreadMessages();
    renderUsers();
}

// 添加评论
function addComment() {
    if (!currentUser) {
        alert('请先设置用户名');
        return;
    }

    if (!selectedTask) {
        alert('请先选择一个任务');
        return;
    }

    const content = commentInput.value.trim();
    if (!content) {
        alert('请输入评论内容');
        return;
    }

    const comment = {
        id: Date.now().toString(),
        taskId: selectedTask.id,
        author: currentUser,
        content: content,
        timestamp: new Date().toISOString()
    };

    // 保存评论到本地
    if (!comments[selectedTask.id]) {
        comments[selectedTask.id] = [];
    }
    comments[selectedTask.id].push(comment);
    saveComments();

    // 通过Socket发送评论
    if (socket) {
        socket.emit('send-task-comment', {
            taskId: selectedTask.id,
            author: currentUser,
            comment: content
        });
    }

    // 清空输入框
    commentInput.value = '';

    // 重新渲染评论
    renderComments(selectedTask.id);
    
    showNotification('评论发表成功！', 'success');
}

// 渲染评论
function renderComments(taskId) {
    if (!commentsList) return;

    const taskComments = comments[taskId] || [];
    
    if (taskComments.length === 0) {
        commentsList.innerHTML = '<div class="no-comments">暂无评论</div>';
        return;
    }

    // 按时间排序（最新的在前）
    const sortedComments = taskComments.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    commentsList.innerHTML = sortedComments.map(comment => `
        <div class="comment-item">
            <div class="comment-header">
                <span class="comment-author">${escapeHtml(comment.author)}</span>
                <span class="comment-time">${formatTime(comment.timestamp)}</span>
            </div>
            <div class="comment-content">${escapeHtml(comment.content)}</div>
        </div>
    `).join('');
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

function saveUnreadMessages() {
    localStorage.setItem('unreadMessages', JSON.stringify(unreadMessages));
}

function saveComments() {
    localStorage.setItem('comments', JSON.stringify(comments));
}

function loadData() {
    tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    users = JSON.parse(localStorage.getItem('users')) || [];
    messages = JSON.parse(localStorage.getItem('messages')) || {};
    unreadMessages = JSON.parse(localStorage.getItem('unreadMessages')) || {};
    comments = JSON.parse(localStorage.getItem('comments')) || {};
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
        background: ${type === 'success' ? '#48bb78' : type === 'info' ? '#667eea' : '#f56565'};
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
    saveUnreadMessages();
    saveComments();
}, 30000); // 每30秒保存一次
