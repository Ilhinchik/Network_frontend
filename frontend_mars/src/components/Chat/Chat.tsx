import {useUser} from "../../hooks/useUser";
import {Message} from "../../consts";
import {Input} from "../Input/Input";
import {MessageCard} from "../MessageCard/MessageCard";
import {Button} from "@mui/material";
import React from "react";
import "./Chat.css"

type ChatProps = {
  messages: Message[];
  ws: WebSocket | undefined;
  messageArray: Message[];
  setMessageArray: (msg: Message[]) => void;
}

export const Chat: React.FC<ChatProps> = ({messages, ws, messageArray, setMessageArray}) => {
  const {login, resetUser} = useUser();

  // при логауте закрываем соединение
  const handleClickLogoutBtn = () => {
    resetUser();
    if (ws) {
      ws.close(4000, login);
    } else {
      console.log("ws.close(4000, 'User logout'); don't work");
    }
  };

  return (
    <>
      <div className="chat">
        <div className="chat--header">
          Сообщения от {login}
          <Button variant="contained"
                onClick={handleClickLogoutBtn}
                style={{
                  height: 'fit-content',
                  margin: 0,
                  marginRight: '10%',
                  backgroundColor: '#005D8C',
                  borderRadius: '1.7em',
                  textTransform: 'none'
                }}
        >
          Выход
        </Button>
        </div>

        <div className="chat--body">
          {messageArray.length > 0 ?
            <div className="chat--container">
              {messageArray.map((msg: Message, index: number) => (
                <div key={index} className="chat--msg">
                  <MessageCard msg={msg}/>
                </div>
              ))}
            </div>
            :
            <div className="chat--no-msg">
              <div style={{fontSize: '2em', color: 'gray'}}>Здесь будут сообщения</div>
            </div>
          }
        </div>

        <Input ws={ws} setMessageArray={setMessageArray}/>
      </div>

        
    </>
  );
}