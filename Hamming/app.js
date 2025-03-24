const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const {Hamming} = require("./ham");

function makeData(data) {
    const a = new TextEncoder().encode(JSON.stringify(data)) // переводим объект в байтовый массив  
    console.log(a)
    let n = 0; // номер сегмента  
    let cod = [''] // список сегментов по 200 байт  
    // пройдем по всем байтам  
    a.map((el, ind) => {
       //cod[n] += MyHam.Hamming.coding("00000000".substr(el.toString(2).length) + el.toString(2)); // кодируем байт, переведенный в 2 код(с незначащими нулями)  
 
       let a_bit = sep("00000000".substr(el.toString(2).length) + el.toString(2), 4)
       a_bit.map((el, ind) => {
          a_bit[ind] = Hamming.coding(el) 
       })
       cod[n] += a_bit.join('')
 
       if ((ind + 1) % SEGMENT_SIZE === 0) { // разбиваем по 200 байт  
          n++
          cod[n] = ''
       }
 
    })
 
    return sep(cod.join(''), 7)
 }

 function makeMistake(trueData){  
    const badData = []  
    trueData.map((el, index)=>{  
    if (Math.random() < CHANCE_OF_ERROR) {  // шанс 10%, что ошибка 
    const rand_ind = Math.floor(Math.random() * el.length);  
    if (el[rand_ind] === '1')  
        badData[index] = el.substring(0,rand_ind) + '0' + el.substring(rand_ind+1);  
    else  
        badData[index] = el.substring(0,rand_ind) + '1' + el.substring(rand_ind+1);  
    } else  
        badData[index] = el  
    })  
    return badData  
}

function decodingData(badData) {
    const trueData = []
    badData.map((el, ind) => {
       trueData[ind] = Hamming.decoding(el) // декодировка и исправление ошибки если она есть  
    })
    return trueData
 }

 function returnMyJSON(decryptedData) {
    const binByte = sep(decryptedData.join(''), 8) // список байтов в 2 коде  
    const bytesList = []
    let textDecoder = new TextDecoder();
    binByte.map((el, ind) => {
       bytesList.push(parseInt(el, 2));
    })
    
    return textDecoder.decode(new Uint8Array(bytesList))
 }

const SEGMENT_SIZE = 100
const CHANCE_OF_ERROR = 0.1

const app = express();
const sep = (xs, s) => xs.length ? [xs.slice(0, s), ...sep(xs.slice(s), s)] : []

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.json());
app.post('/code', async (req, res) => {
   try {
      console.log("Received from Go:", req.body);


      const queueCoding = makeData(req.body) // закодированные данные  
      console.log(queueCoding)

      const queueMistake = makeMistake(queueCoding) // битые данные  
      console.log(queueMistake)

      const queueDecrypted = decodingData(queueMistake) // декодированные данные 
      console.log(queueDecrypted)
      const jsonData = returnMyJSON(queueDecrypted);
      console.log("Sending to Go server:", jsonData);
      
      // Отправляем декодированные данные на Go-сервер
      const goResponse = await axios.post('http://localhost:8080/transfer', jsonData );

     res.json({ status: "ok", received: req.body });

      //res.send(returnMyJSON(queueDecrypted));
   } catch (e) {
      console.log(e);
      res.send({error: e.message});
   }
});   

 app.listen(3050, () => {  
    console.log(`Server initialized. Try it on http://localhost:${3050}`);  
    })