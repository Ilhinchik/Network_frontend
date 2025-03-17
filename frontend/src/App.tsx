import React, {useEffect, useState} from 'react';
import './App.css';
import {useUser} from "./hooks/useUser";
import {Login} from "./components/Login/Login";
import {hostname, Message} from "./consts";
import {Chat} from "./components/Chat/Chat";

function App() {
  const {login} = useUser();
  const [ws, setWs] = useState<WebSocket | undefined>();  // весокет
  const [messageArray, setMessageArray] = useState<Message[]>([]);

  // создание вебсокета должно быть после рендера - поместим в useEffect
  useEffect(() => {
    if (login) {
      setWs(
        createWebSocket(
          `ws://${hostname}:8010/?username=${encodeURIComponent(login)}`,
        ),
      );
    } else {
      setWs(new WebSocket(`ws://${hostname}`));
    }
  }, []);

  // создаем вебсокет
  const createWebSocket = (url: string) => {
    const ws = new WebSocket(url); // создаем новый инстанс

    // обработчик на открытие соединения
    ws.onopen = function () {
      console.log('WebSocket connection opened');
    };

    // обработчик на получение сообщения
    ws.onmessage = function (event) {
      const msgString = event.data;
      const message = JSON.parse(msgString); // парсим

      console.log('MessageCard from server:', message);

      // сеттим сообщение в массив
      setMessageArray((currentMsgArray: Message[]) => [...currentMsgArray, message]);
    };
    // обработчик на закрытие
    ws.onclose = function () {
      console.log('WebSocket connection closed');
    };

    // обработчик на ошибку
    ws.onerror = function (event) {
      console.error('WebSocket error:', event);
    };

    return ws;
  };

  // дальше будут две страницы - с чатом и авторизацией
  return (
    <>
      <div className="App">
        {login ?
          <Chat messages={messageArray} ws={ws} messageArray={messageArray} setMessageArray={setMessageArray}/>
          :
          <Login ws={ws} setWs={setWs} createWebSocket={createWebSocket}/>
        }
      </div>
    </>
  );
}

export default App;