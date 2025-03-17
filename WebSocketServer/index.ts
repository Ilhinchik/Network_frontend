import express from 'express';
import axios from 'axios';
import http from 'http';
import { WebSocketServer } from 'ws';
import { WebSocket } from 'ws';

const port: number = 8010; // порт на котором будет развернут этот (вебсокет) сервер
const hostname = 'localhost'; // адрес вебсокет сервера
const transportLevelPort = 8081; // порт сервера транспортного уровня
const transportLevelHostname = 'localhost'; // адрес сервера транспортного уровня

interface Message {
  id?: number
  username: string
  data?: string
  send_time?: string
  error?: string
}

type Users = Record<string, Array<{
  id: number
  ws: WebSocket
}>>

const app = express() // создание экземпляра приложения express
const server = http.createServer(app) // создание HTTP-сервера

// Используйте express.json() для парсинга JSON тела запроса
app.use(express.json())

app.post('/receive', (req: { body: Message }, res: { sendStatus: (arg0: number) => void }) => {
  const message: Message = req.body
  sendMessageToOtherUsers(message.username, message)
  res.sendStatus(200)
  console.log('Received message:', message)
})

// Функция для отправки сообщения на сервер транспортного уровня
async function sendToTransportLevel(message: Message): Promise<void> {
  try {
    const response = await axios.post(
      `http://${transportLevelHostname}:${transportLevelPort}/send`, // адрес транспортного уровня
      message, // тело запроса
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    console.log('Message sent to transport level:', response.data);
  } catch (error) {
    console.error('Error sending message to transport level:', error);
  }
}

// запуск сервера приложения
server.listen(port, hostname, () => {
  console.log(`Server started at http://${hostname}:${port}`)
})

const wss = new WebSocketServer({ server })
const users: Users = {}

function sendMessageToOtherUsers (username: string, message: Message): void {
  const msgString = JSON.stringify(message)
  for (const key in users) {
    console.log(`[array] key: ${key}, users[keys]: ${JSON.stringify(users[key])} username: ${username}`)
    if (key !== username) {
      users[key].forEach(element => {
        element.ws.send(msgString)
      })
    }
  }
}

wss.on('connection', (websocketConnection: WebSocket, req: Request) => {
  if (req.url.length === 0) {
    console.log(`Error: req.url = ${req.url}`)
    return
  }
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  const url = new URL(req?.url, `http://${req.headers.host}`)
  const username = url.searchParams.get('username')

  if (username !== null) {
    console.log(`[open] Connected, username: ${username}`)

    if (username in users) {
      users[username] = [...users[username], { id: users[username].length, ws: websocketConnection }]
    } else {
      users[username] = [{ id: 1, ws: websocketConnection }]
    }
  } else {
    console.log('[open] Connected')
  }

  console.log('users collection', users)

  websocketConnection.on('message', (messageString: string) => {
    console.log('[message] Received from ' + username + ': ' + messageString)

    const message: Message = JSON.parse(messageString)
    message.username = message.username ?? username
    //sendMessageToOtherUsers(message.username, message)
    sendToTransportLevel(message); // отправляем на транспортный уровень
  })

  websocketConnection.on('close', (event: any) => {
    console.log(username, '[close] Соединение прервано', event)

    delete users.username
  })
})