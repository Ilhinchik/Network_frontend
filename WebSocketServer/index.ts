import express from 'express';
import axios from 'axios';
import http from 'http';
import { WebSocketServer } from 'ws';
import { WebSocket } from 'ws';

const portMars: number = 8010;
const portEarth: number = 8005; // порт на котором будет развернут этот (вебсокет) сервер
const hostname = 'localhost'; // адрес вебсокет сервера
const transportLevelPort = 8080; // порт сервера транспортного уровня
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

const appEarth = express() // создание экземпляра приложения express
const serverEarth = http.createServer(appEarth) // создание HTTP-сервера
const appMars = express(); // Сервер для взаимодействия с транспортным уровнем
const serverMars = http.createServer(appMars);
// Используйте express.json() для парсинга JSON тела запроса
appMars.use(express.json())

appMars.post('/receive', (req: { body: Message }, res: { sendStatus: (arg0: number) => void }) => {
  const message: Message = req.body
  //sendMessageToOtherUsers(message.username, message)
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
serverEarth.listen(portEarth, hostname, () => {
  console.log(`Server started at http://${hostname}:${portEarth}`)
})
serverMars.listen(portMars, hostname, () => {
  console.log(`Mars Transport Level Server started at http://${hostname}:${portMars}`);
});

const wssEarth = new WebSocketServer({ server: serverEarth })
const wssMars = new WebSocketServer({ server: serverMars })
const usersEarth: Users = {};
const usersMars: Users = {};

function sendMessageToOtherUsers (username: string, message: Message, planet: string): void {
  const msgString = JSON.stringify(message)
  const users = planet === 'earth' ? usersEarth : usersMars;

  for (const key in users) {
    console.log(`[array] key: ${key}, users[keys]: ${JSON.stringify(users[key])} username: ${username}`)
    if (key !== username) {
      users[key].forEach(element => {
        element.ws.send(msgString)
      })
    }
  }
}

// Обработчик подключения для Земли
wssEarth.on('connection', (websocketConnection: WebSocket, req: any) => {
  handleWebSocketConnection(websocketConnection, req, 'earth')
})

// Обработчик подключения для Марса
wssMars.on('connection', (websocketConnection: WebSocket, req: any) => {
  handleWebSocketConnection(websocketConnection, req, 'mars')
})

function handleWebSocketConnection(websocketConnection: WebSocket, req: Request, planet: string) {
  if (req.url.length === 0) {
    console.log(`Error: req.url = ${req.url}`)
    return
  }
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  const url = new URL(req?.url, `http://${req.headers.host}`)
  const username = url.searchParams.get('username')
  const users = planet === 'earth' ? usersEarth : usersMars;

  if (username !== null) {
    console.log(`[open] Connected to ${planet}, username: ${username}`)

    if (username in users) {
      users[username] = [...users[username], { id: users[username].length, ws: websocketConnection }]
    } else {
      users[username] = [{ id: 1, ws: websocketConnection }]
    }
  } else {
    console.log(`[open] Connected to ${planet}`)
  }

  console.log(`Users on ${planet}:`, users)

  websocketConnection.on('message', (messageString: string) => {
    console.log(`[${planet}] [message] Received from ${username}: ${messageString}`)

    const message: Message = JSON.parse(messageString)
    message.username = message.username ?? username
    sendMessageToOtherUsers(message.username, message, planet)
    if (planet === 'earth') {
      sendToTransportLevel(message); // отправляем на транспортный уровень
    }
  })

  websocketConnection.on('close', (event: any) => {
    console.log(`[${planet}] ${username} [close] Соединение прервано`, event)

    delete users.username
  })
}
