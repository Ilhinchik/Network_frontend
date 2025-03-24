package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/IBM/sarama"
	"github.com/gorilla/mux"
)

type Segment struct {
    SegmentNumber   int       `json:"segment_number"`
    TotalSegments   int       `json:"total_segments"`
    Username        string    `json:"username"`
    SendTime        time.Time `json:"send_time"`
    SegmentPayload  string    `json:"payload"`
}

const (
    KafkaAddr       = "localhost:29092"
    KafkaTopic      = "segments"
)

func ReadFromKafka() error {
    config := sarama.NewConfig()
    config.Consumer.Return.Errors = true
    
    // создание consumer-а
    consumer, err := sarama.NewConsumer([]string{KafkaAddr}, config)
    if err != nil {
        return fmt.Errorf("error creating consumer: %w", err)
    }
    defer consumer.Close()
    
    // подключение consumer-а к топика
    partitionConsumer, err := consumer.ConsumePartition(KafkaTopic, 0, sarama.OffsetNewest)
    if err != nil {
        return fmt.Errorf("error opening topic: %w", err)
    }
    defer partitionConsumer.Close()
    
    // бесконечный цикл чтения
    for {
        select {
        case message := <-partitionConsumer.Messages():
            segment := Segment{}
            if err := json.Unmarshal(message.Value, &segment); err != nil {
                fmt.Printf("Error reading from kafka: %v", err)
            }
            fmt.Printf("Reading from Kafka: %+v\n", segment) // выводим в консоль прочитанный сегмент
            AddSegment(segment)
        case err := <-partitionConsumer.Errors():
            fmt.Printf("Error: %s\n", err.Error())
        }
    }
}

func WriteToKafka(segment Segment) error {
    config := sarama.NewConfig()
    config.Producer.Return.Successes = true
    
    // создание producer-а
    producer, err := sarama.NewSyncProducer([]string{KafkaAddr}, config)
    if err != nil {
        return fmt.Errorf("error creating producer: %w", err)
    }
    defer producer.Close()
    
    // превращение segment в сообщение для Kafka
    segmentString, _ := json.Marshal(segment)
    message := &sarama.ProducerMessage{
        Topic: KafkaTopic,
        Value: sarama.StringEncoder(segmentString),
    }
    fmt.Println("Writing to Kafka:", string(segmentString))
    // отправка сообщения
    _, _, err = producer.SendMessage(message)
    if err != nil {
        return fmt.Errorf("failed to send message: %w", err)
    }
    
    return nil
}

func HandleTransfer(w http.ResponseWriter, r *http.Request) {
    // читаем тело запроса - сегмент
    body, err := io.ReadAll(r.Body)
    if err != nil {
		log.Println("Error reading body:", err)
        w.WriteHeader(http.StatusBadRequest)
        return
    }
    defer r.Body.Close()

    // парсим сегмент в структуру
    segment := Segment{}


    if err = json.Unmarshal(body, &segment); err != nil {
		log.Println("Error unmarshalling segment:", err)
        w.WriteHeader(http.StatusBadRequest)
        return
    }
    
    // пишем сегмент в Kafka
    if err = WriteToKafka(segment); err != nil {
		log.Println("Error writing to Kafka:", err)
        w.WriteHeader(http.StatusInternalServerError)
        return
    }
    
    w.WriteHeader(http.StatusOK)
}

const ReceiveUrl = "http://localhost:8010/receive" // адрес websocket-сервера прикладного уровня

func SendReceiveRequest(body ReceiveRequest) {
   reqBody, _ := json.Marshal(body)
   
   req, _ := http.NewRequest("POST", ReceiveUrl, bytes.NewBuffer(reqBody))
   req.Header.Add("Content-Type", "application/json")
   
   client := &http.Client{}
   resp, err := client.Do(req)
   if err != nil {
    log.Println("Error sending request:", err)
    return
}
   
defer resp.Body.Close()
if resp.StatusCode != http.StatusOK {
    log.Printf("Received non-OK status: %d", resp.StatusCode)
}
}

func main() {
    // запуск consumer-а
    go func() {
        if err := ReadFromKafka(); err != nil {
            fmt.Println(err)
        }
    }()

    go func() {
        ticker := time.NewTicker(KafkaReadPeriod)
        defer ticker.Stop()
        
        for {
           select {
           case <-ticker.C:
               ScanStorage(SendReceiveRequest)
           }
        }
     }()
	
    // создание роутера
    r := mux.NewRouter()
    r.NotFoundHandler = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        http.Error(w, "Not Found", http.StatusNotFound)
    })
	// Обработчик для маршрута /transfer
    r.HandleFunc("/send", HandleSend).Methods(http.MethodPost, http.MethodOptions)
	r.HandleFunc("/transfer", HandleTransfer).Methods(http.MethodPost, http.MethodOptions)
    http.Handle("/", r)

    signalCh := make(chan os.Signal, 1)
    signal.Notify(signalCh, syscall.SIGINT, syscall.SIGTERM)

    // запуск http сервера
    srv := http.Server{
        Handler:           r,
        Addr:              ":8080",
        ReadTimeout:       10 * time.Second,
        WriteTimeout:      10 * time.Second,
        ReadHeaderTimeout: 10 * time.Second,
    }
    go func() {
        if err := srv.ListenAndServe(); err != nil {
            fmt.Println("Server stopped")
        }
    }()
    fmt.Println("Server started")

    // graceful shutdown
    sig := <-signalCh
    fmt.Printf("Received signal: %v\n", sig)
    
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()
    
    if err := srv.Shutdown(ctx); err != nil {
        fmt.Printf("Server shutdown failed: %v\n", err)
    }
}