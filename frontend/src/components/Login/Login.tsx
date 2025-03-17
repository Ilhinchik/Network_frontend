import React, {useState} from "react";
import {useUser} from "../../hooks/useUser";
import {Button, TextField} from '@mui/material';
import {hostname} from "../../consts";
import "./Login.css"

type LoginProps = {
  ws: WebSocket | undefined;
  setWs: (ws: WebSocket | undefined) => void;
  createWebSocket: (url: string) => WebSocket | undefined;
}

export const Login: React.FC<LoginProps> = ({ws, setWs, createWebSocket}) => {
  const {login, setUser} = useUser();
  const [userName, setUsername] = useState(login);

  const handleChangeLogin = (event: any) => {
    setUsername(event.target.value);
  };

  // при авторизации регистрируем новое вебсокет соединеие
  const handleClickSignInBtn = () => {
    setUser({
      userInfo: {
        Data: {
          login: userName,
        },
      },
    });
    if (ws) {
      ws.close(1000, 'User enter userName');
    } else {
      console.log('ws.close(1000, User enter userName); dont work');
    }
    setWs(
      createWebSocket(
        `ws://${hostname}:8010/?username=${encodeURIComponent(userName)}`,
      ),
    );
  };

  return (
    <>
      <div className="login">
        <div className="login--card">
          <div className="login--header">Вход</div>

          <TextField id="outlined-basic" label="Введите имя" variant="outlined"
            className="login--input"
            value={userName}
            onChange={handleChangeLogin}
          />

          <Button variant="contained"
                  onClick={handleClickSignInBtn}
          >
            Войти
          </Button>

        </div>
      </div>
    </>
  );
}