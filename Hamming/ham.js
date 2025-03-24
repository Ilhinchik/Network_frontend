class Hamming {
    static _calcRedundantBits(m) {
        for (let i = 0; i < m; i++) {
            if (Math.pow(2, i) >= m + i + 1) {
                return i;
            }
        }
    }

    static _posRedundantBits(data, r) {
        let j = 0;
        let k = 1;
        let m = data.length;
        let res = '';

        for (let i = 1; i < m + r + 1; i++) {
            if (i === Math.pow(2, j)) {
                res = res + '0';
                j += 1;
            } else {
                res = res + data[data.length - k];
                k += 1;
            }
        }
        return res.split('').reverse().join('');
    }

    static _calcParityBits(arr, r) {
        let n = arr.length;
    
        for (let i = 0; i < r; i++) {
            let val = 0;
            for (let j = 1; j <= n; j++) {
                if ((j & (1 << i)) === (1 << i)) {
                    val = val ^ parseInt(arr[n - j]);
                }
            }
            // Place the parity bit at the correct position
            let pos = Math.pow(2, i);
            arr = arr.slice(0, n - pos) + val + arr.slice(n - pos + 1);
        }
        return arr;
    }

    static _detectError(arr) {
        // Определяем кол-во контрольных битов в последовательности
        let nr = 0
        for (let i = 1; i < arr.length; i++)
            if (Math.pow(2, i) >= arr.length)
            {
                nr = i
                break
            }

        let n = arr.length;
        let res = 0;

        for (let i = 0; i < nr; i++) {
            let val = 0;
            for (let j = 1; j < n + 1; j++) {
                if ((j & Math.pow(2, i)) === Math.pow(2, i)) {
                    val = val ^ parseInt(arr[arr.length - j]);
                }
            }
            res = res + val * Math.pow(10, i);
        }

        return arr.length - parseInt(res.toString(), 2) + 1;
    }

    static _fixError(data){
        let nError = this._detectError(data)
        if (nError === 0)
            return data

        if (data[nError - 1] === '1')
            return  this._replaceAt(data, nError-1, "0")
        else
            return  this._replaceAt(data, nError-1, "1")

    }

    static _decodingHam(data) {
        data = this._fixError(data); // Fix error if any
    
        let nr = 0;
        for (let i = 1; i < data.length; i++) {
            if (Math.pow(2, i) >= data.length) {
                nr = i;
                break;
            }
        }
    
        // Remove redundant bits
        let result = '';
        for (let i = 1; i <= data.length; i++) {
            if ((i & (i - 1)) !== 0) { // Skip positions that are powers of 2
                result += data[data.length - i];
            }
        }
    
        return result.split("").reverse().join("");
    }

    static _replaceAt(str,index,replacement) {
        if(index > str.length-1) return str;
        return str.substring(0,index) + replacement + str.substring(index+1);
    }

      /**
         * Указывает номер плохого бита, если его нет, то возвращает 0
         * @param data Данные для поиска ошибки
         * @returns {number} Номер бита ошибки, если его нет, то 0
         */
      static checkError(data){
        return this._detectError(data)
    }
     
    static fixedError(data){
        return this._fixError(data)
    }

    static decoding(data){
        return this._decodingHam(data)
    }

            /**
         * Закодировать данные кодом хэмминга
         * @param data Строка с данными
         * @returns {*} Закодированная строка
         */
        static coding(data){
            let r = this._calcRedundantBits(data.length)
            return this._calcParityBits(this._posRedundantBits(data, r), r)
        }
}

module.exports = { Hamming };

const originalData = "10000000000";
const encodedData = Hamming.coding(originalData);

console.log("Original Data:", originalData);
console.log("Encoded Data:", encodedData);

// Вносим ошибку в закодированные данные (например, изменим первый бит)
let erroneousData = Hamming._replaceAt(encodedData, 0, encodedData[0] === '0' ? '1' : '0');

console.log("Erroneous Data:", erroneousData);

// Проверяем наличие ошибки и ее позицию
let errorBitPosition = Hamming.checkError(erroneousData);
console.log("Error Bit Position:", errorBitPosition);

// Исправляем ошибку и декодируем данные обратно
let fixedData = Hamming.fixedError(erroneousData);
console.log("Fixed Data:", fixedData);

let decodedData = Hamming.decoding(fixedData);
console.log("Decoded Data:", decodedData);
