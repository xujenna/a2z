// Word2Vec class and callCallback function stolen from http://ml5js.org

function callCallback(promise, callback) {
  if (callback) {
    promise
      .then((result) => {
        callback(undefined, result);
        return result;
      })
      .catch((error) => {
        callback(error);
        return error;
      });
  }
  return promise;
}

class Word2Vec {
  constructor(modelPath, callback) {
    this.model = {};
    this.modelPath = modelPath;
    this.modelSize = 0;
    this.modelLoaded = false;

    this.ready = callCallback(this.loadModel(), callback);
  }

  async loadModel() {
    const json = await fetch(this.modelPath)
      .then(response => response.json());
    Object.keys(json.vectors).forEach((word) => {
      // this.model[word] = tf.tensor2d(json.vectors[word],[300,1]);
      this.model[word] = tf.tensor1d(json.vectors[word]);
    });
    this.modelSize = Object.keys(this.model).length;
    this.modelLoaded = true;
    return this;
  }

  dispose(callback) {
    Object.values(this.model).forEach(x => x.dispose());
    if (callback) {
      callback();
    }
  }
};




let word2vec = new Word2Vec('data/wordvecs10000.json', modelLoaded);
const SpeechRecognition = webkitSpeechRecognition;
const synth = window.speechSynthesis;
let playerOneScore = 0;
let data;
let data_keys;
let counter;
let tsneOpt;
let tsneCoordinates;

let plotSVG = d3.select("#tsneSVG")
.append("svg:svg")
  .attr("width",1300)
  .attr("height",800);

// let canvas = document.getElementById("tsneCanvas");
// let ctx = canvas.getContext("2d");
// ctx.font = "18px Arial";
// ctx.fillText("hello",100,300);
// ctx.fillStyle = "#FF0000";

const speak = (textInput) => {
  if(synth.speaking){
    console.error('already speaking')
    return;
  }
  let utterThis = new SpeechSynthesisUtterance(textInput)
  synth.speak(utterThis)
}


function modelLoaded() {
  document.getElementById('start-button').textContent = "Computing t-SNE...";
  tsnefy();
}

async function tsnefy() {
  data = Object.keys(word2vec.model).map(k => Array.prototype.slice.call(word2vec.model[k].dataSync()));
  data_keys = Object.keys(word2vec.model);
  word2vec_tsne_tensor = tf.tensor2d(data);
  tsneOpt = tsne.tsne(word2vec_tsne_tensor);
  await tsneOpt.compute().then(() => {
     tsneCoordinates = tsneOpt.coordsArray();
  })
  document.getElementById('start-button').innerHTML= "<button onclick='start();'>Start Game</button>";
}

// function randomProperty(obj) {
//   var keys = Object.keys(obj)

//   return keys[keys.length * Math.random() << 0];
// };

function start() {
  // document.querySelector('#start-button > button').disabled = true;
  document.querySelector('#start-button > button').style.display = "none";
  document.querySelector('#scoring').style.display = "block";
  // document.getElementById('currentWord').textContent = "";
  document.getElementById('lastRoundPoints').textContent = 0;
  document.getElementById('lastRoundTimePenalty').textContent = 0;
  document.getElementById('playerOneScore').textContent = 0;
  // ctx.clearRect(0,0,canvas.width, canvas.height);
  // ctx.beginPath();
  // plotSVG.parentNode.replaceChild(plotSVG.cloneNode(false), plotSVG);
  plotSVG.remove();
  plotSVG = d3.select("#tsneSVG")
  .append("svg:svg")
    .attr("width",1300)
    .attr("height",800);

  // document.querySelector('#tsneCanvas').style.display = "block";
  playerOneScore = 0;
  // let starter = randomProperty(word2vec.model)
  let starter = data_keys[data_keys.length * Math.random() << 0]

  // document.getElementById('currentWord').textContent = starter;
  getCoordinates(starter);
  speak(starter);
  newTurn(starter);
}


function newTurn(word) {
  let count = 0;
  counter = setInterval(function() {
    count += 1;
    document.getElementById('countDown').textContent = 7-count;
    if(count >= 6){
      gameOver();
    }
  }, 1000);

  const recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.start();

  recognition.onresult = event => {
    let timePenalty = Math.pow(count, 4) * 10;
    console.log("time penalty: " + timePenalty)
    clearInterval(counter);

    let newWord = event.results[0][0].transcript;
    newWord = newWord.toLowerCase();
    // console.log(newWord)
    // document.getElementById('currentWord').textContent = newWord;

    try {
      let wordDistance = distance(word, newWord);
      let newScore = Math.round(Math.pow((wordDistance*10),3)) - timePenalty;
      console.log(newScore)
      // document.getElementById('lastRoundScore').textContent = newScore;
      document.getElementById('lastRoundPoints').textContent = newScore + timePenalty;
      document.getElementById('lastRoundTimePenalty').textContent = timePenalty;
      getCoordinates(newWord);

      playerOneScore += newScore;
      document.getElementById('playerOneScore').textContent = playerOneScore;

      newTurn(newWord)

    }
    catch(err){
      console.log("error: " + err)
      document.getElementById('tryAgain').textContent = "Try again (" + newWord + " not in model)";
      newTurn(word)
    }

  }

  recognition.onend = () => {
		console.log("ended recording");
		recognition.stop();
  }
  
  recognition.onerror = event => {
		console.log("error: " + event.error);
  }
}


const scale = (num, in_min, in_max, out_min, out_max) => {
  return (num - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

let prev_xCoord;
let prev_yCoord;


async function getCoordinates(word) {
  let wordIndex = data_keys.indexOf(word);
  console.log(wordIndex);
  words = document.querySelectorAll("text");
  words.forEach(function(d){d.classList.replace("newEmbeddingText", "embeddingText")})

  // let wordIndex = data.indexOf(Array.prototype.slice.call(word2vec.model[word].dataSync()));
  await tsneCoordinates.then(function(result) {
    console.log(result[wordIndex]);
    let xCoord = scale(result[wordIndex][0], 0, 1, 0, 1200);
    let yCoord = scale(result[wordIndex][1], 0, 1, 0, 800);
    console.log(xCoord)
    console.log(yCoord)
    // ctx.font = "18px monospace";
    // ctx.fillText(word,xCoord,yCoord);
    // ctx.fillStyle = "#FF0000";
    plotSVG.append("text")
      .text(word)
      .attr("x", xCoord)
      .attr("y", yCoord)
      .attr("class", "newEmbeddingText");

    try{
      // ctx.moveTo(prev_xCoord,prev_yCoord);
      // ctx.lineTo(xCoord,yCoord);
      // ctx.stroke();
      plotSVG.append("line")
        .attr("x1", prev_xCoord)
        .attr("y1", prev_yCoord)
        .attr("x2", xCoord)
        .attr("y2", yCoord)
        .attr("stroke", "grey")
        .attr("stroke-width", 1.5)
        .attr("opacity", 0.3)
        .attr("stroke-dasharray", 3)
    }
    finally{
      prev_xCoord = xCoord;
      prev_yCoord = yCoord;
    }
  });
}

function distance(a, b) {
  let result = tf.util.distSquared(word2vec.model[a].dataSync(), word2vec.model[b].dataSync());
  return result;
}

function gameOver(){
  clearInterval(counter);
  document.getElementById('countDown').textContent = "Game Over";
  // document.querySelector('#start-button > button').disabled = false;
  // document.querySelector('#start-button > button').style.display = "block";
  // document.querySelector('#start-button > button').textContent = "Restart Game";
  document.getElementById('restart-button').style.display= "inline-block";
}
