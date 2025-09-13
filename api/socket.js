import { Server } from 'socket.io';

const SocketHandler = (req, res) => {
  if (res.socket.server.io) {
    console.log('Socket is already running');
  } else {
    console.log('Socket is initializing');
    const io = new Server(res.socket.server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });
    res.socket.server.io = io;

    // 存储在线用户
    const onlineUsers = new Map();
    const chatRooms = new Map();

    io.on('connection', (socket) => {
      console.log('User connected:', socket.id);

      // 用户加入
      socket.on('user-join', (userData) => {
        onlineUsers.set(socket.id, {
          id: socket.id,
          username: userData.username,
          joinTime: new Date().toISOString()
        });
        
        // 广播在线用户列表
        io.emit('users-updated', Array.from(onlineUsers.values()));
        console.log(`${userData.username} joined`);
      });

      // 加入私聊房间
      socket.on('join-private-chat', (data) => {
        const roomId = [data.user1, data.user2].sort().join('_');
        socket.join(roomId);
        socket.emit('joined-room', roomId);
      });

      // 发送私聊消息
      socket.on('send-private-message', (data) => {
        const roomId = [data.from, data.to].sort().join('_');
        socket.to(roomId).emit('receive-private-message', {
          from: data.from,
          to: data.to,
          message: data.message,
          timestamp: new Date().toISOString()
        });
      });

      // 加入任务讨论房间
      socket.on('join-task-room', (taskId) => {
        socket.join(`task_${taskId}`);
        socket.emit('joined-task-room', taskId);
      });

      // 发送任务评论
      socket.on('send-task-comment', (data) => {
        socket.to(`task_${data.taskId}`).emit('receive-task-comment', {
          taskId: data.taskId,
          author: data.author,
          comment: data.comment,
          timestamp: new Date().toISOString()
        });
      });

      // 任务状态更新
      socket.on('task-updated', (taskData) => {
        io.emit('task-status-changed', taskData);
      });

      // 新任务发布
      socket.on('new-task', (taskData) => {
        io.emit('task-created', taskData);
      });

      // 断开连接
      socket.on('disconnect', () => {
        const user = onlineUsers.get(socket.id);
        if (user) {
          onlineUsers.delete(socket.id);
          io.emit('users-updated', Array.from(onlineUsers.values()));
          console.log(`${user.username} disconnected`);
        }
      });
    });
  }
  res.end();
};

export default SocketHandler;
