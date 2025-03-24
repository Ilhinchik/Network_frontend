package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

func SplitMessage(payload string, segmentSize int) []string {
    runes := []rune(payload) // Преобразуем строку в массив рун (символов)
    length := len(runes) // Длина теперь в символах, а не в байтах

    var result []string
    for i := 0; i < length; i += segmentSize {
        end := i + segmentSize
        if end > length {
            end = length
        }
        fmt.Printf("Segment %d: %s\n", len(result)+1, string(runes[i:end]))
        result = append(result, string(runes[i:end])) // Берем срез по символам
    }

    return result
}


// func SplitMessage(payload string, segmentSize int) []string {
//     result := make([]string, 0)

//     length := len(payload) // длина в байтах
//     segmentCount := int(math.Ceil(float64(length) / float64(segmentSize)))

//     for i := 0; i < segmentCount; i++ {
//         result = append(result, payload[i*segmentSize:min((i+1)*segmentSize, length)]) // срез делается также по байтам
//     }
//fmt.Println(result)
//     return result
// }

//const CodeUrl = "http://localhost:8080/send" // без канального уровня
const CodeUrl = "http://localhost:3050/code" // адрес канального уровня

func SendSegment(body Segment) {
    reqBody, _ := json.Marshal(body)
   
    req, _ := http.NewRequest("POST", CodeUrl, bytes.NewBuffer(reqBody))
    req.Header.Add("Content-Type", "application/json")
   
    client := &http.Client{}
    resp, err := client.Do(req)
    if err != nil {
        return
    }
   
    defer resp.Body.Close()
}

const SegmentSize = 100

type SendRequest struct {
    Id       int       `json:"id,omitempty"`
    Username string    `json:"username"`
    Text     string    `json:"data"`
    SendTime time.Time `json:"send_time"`
}

func HandleSend(w http.ResponseWriter, r *http.Request) {
   // читаем тело запроса - сообщение
   body, err := io.ReadAll(r.Body)
   if err != nil {
      w.WriteHeader(http.StatusBadRequest)
      return
   }
   defer r.Body.Close()
   
   // парсим сообщение в структуру
   message := SendRequest{}
   if err = json.Unmarshal(body, &message); err != nil {
      w.WriteHeader(http.StatusBadRequest)
      return
   }
   
   // сразу отвечаем прикладному уровню 200 ОК - мы приняли работу
   w.WriteHeader(http.StatusOK)
   
   // разбиваем текст сообщения на сегменты
   segments := SplitMessage(message.Text, SegmentSize)
   total := len(segments)
   
   // в цикле отправляем сегменты на канальный уровень
   for i, segment := range segments {
      payload := Segment{
         SegmentNumber:  i + 1,
         TotalSegments:  total,
         Username:       message.Username,
         SendTime:       message.SendTime,
         SegmentPayload: segment,
      }
      go SendSegment(payload) // запускаем горутину с отправкой на канальный уровень, не будем дожидаться результата ее выполнения
      fmt.Printf("sent segment to channel: %+v\n", payload)
   }
}