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


  // Initialize Firebase
  var config = {
    apiKey: "AIzaSyAGKvWESjIqkNOXic9P-SCCrcFjFn3tmKM",
    authDomain: "word2vecgame.firebaseapp.com",
    databaseURL: "https://word2vecgame.firebaseio.com",
    projectId: "word2vecgame",
    storageBucket: "word2vecgame.appspot.com",
    messagingSenderId: "254456730638"
  };
  firebase.initializeApp(config);


var database = firebase.database();
let word2vec = new Word2Vec('data/wordvecs10000.json', modelLoaded);
const SpeechRecognition = webkitSpeechRecognition;
const synth = window.speechSynthesis;
let playerOneScore = 0;
let playerOnePoints = 0;
let playerOneTimePenalty = 0;
let playerTwoScore = 0;
let playerTwoPoints = 0;
let playerTwoTimePenalty = 0;
let data;
let data_keys;
let counter;
let tsneOpt;
let tsneCoordinates;
let playerNum = 0;
let body = document.querySelector("body");
let tryAgain = false;


let plotSVG = d3.select("#tsneSVG")
.append("svg:svg")
  .attr("width","85%")
  .attr("height","98%");


async function speak(textInput) {
  if(synth.speaking){
    console.error('already speaking')
    return;
  }
  let utterThis = new SpeechSynthesisUtterance(textInput)
  await synth.speak(utterThis)
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
  playerNum = 0;
  tryAgain = false;
  prev_xCoord = 0;
  prev_yCoord = 0;
  playerOneScore = 0;
  playerTwoScore = 0;

  // document.querySelector('#start-button > button').disabled = true;
  document.getElementById('restart-button').style.display= "none";
  document.querySelector('#start-button > button').style.display = "none";
  document.getElementById('rules').style.display= "none";
  document.querySelector('#scoring').style.display = "block";
  let scores = document.querySelectorAll(".playerStates > h2");
  scores.forEach(function(d){d.textContent=0});

  plotSVG.remove();
  plotSVG = d3.select("#tsneSVG")
  .append("svg:svg")
    .attr("width",1300)
    .attr("height",800);

  // document.querySelector('#tsneCanvas').style.display = "block";

  // let starter = randomProperty(word2vec.model)
  let starter = data_keys[data_keys.length * Math.random() << 0]

  // document.getElementById('currentWord').textContent = starter;
  getCoordinates(starter);
  speak(starter);
  setTimeout(function(){newTurn(starter);}, 800);
}


function newTurn(word) {
  if(tryAgain==true){
    tryAgain = false;
  }
  else{
    if(playerNum == 0 || playerNum == 2){
      playerNum = 1;
      body.style.border = "25px solid fuchsia";
    }
    else{
      playerNum = 2;
      body.style.border = "25px solid springgreen";
    }
  }
  console.log("newTurn PlayerNum: "+ playerNum)

  document.getElementById('player').textContent = "Player " + playerNum;

  let count = 0;
  counter = setInterval(function() {
    count += 1;
    document.getElementById('countDown').textContent = "00:0" + (7-count);
    if(count >= 6){
      gameOver();
    }
  }, 1000);

  const recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.start();

  recognition.onresult = event => {
    document.getElementById('tryAgain').textContent = "";

    let timePenalty = Math.pow(count, 4) * 20;
    console.log("time penalty: " + timePenalty)
    clearInterval(counter);

    let newWord = event.results[0][0].transcript;
    newWord = newWord.toLowerCase();
    // console.log(newWord)
    // document.getElementById('currentWord').textContent = newWord;

    try {
      // document.getElementById('newEmbeddingText').removeAttribute("id");

      let score = Math.round(Math.pow((distance(word, newWord)*10),3));
      let newScore = score - timePenalty;
      console.log(newScore)
      // document.getElementById('lastRoundScore').textContent = newScore;
      // document.getElementById('lastRoundPoints').textContent = newScore + timePenalty;
      // document.getElementById('lastRoundTimePenalty').textContent = timePenalty;
      getCoordinates(newWord, score, timePenalty, playerNum);

      if(playerNum == 1){
        playerOneScore += newScore;
        playerOnePoints += score;
        playerOneTimePenalty += timePenalty;
        document.getElementById('playerOneScore').textContent = playerOneScore;
        document.getElementById('playerOnePoints').textContent = playerOnePoints;
        document.getElementById('playerOneTimePenalty').textContent = playerOneTimePenalty;
      }
      else{
        playerTwoScore += newScore;
        playerTwoPoints += score;
        playerTwoTimePenalty += timePenalty;
        document.getElementById('playerTwoScore').textContent = playerTwoScore;
        document.getElementById('playerTwoPoints').textContent = playerTwoPoints;
        document.getElementById('playerTwoTimePenalty').textContent = playerTwoTimePenalty;
      }

      newTurn(newWord)
    }
    catch(err){
      console.log("error: " + err)
      document.getElementById('tryAgain').textContent = "Try again ('" + newWord + "' not in model)";
      speak("Try again");
      tryAgain = true;
      setTimeout(function(){newTurn(word)}, 1500);
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

let prev_xCoord = 0;
let prev_yCoord = 0;


async function getCoordinates(word,score,timePenalty,playerNum) {
  console.log("getCoordinates playerNum: " + playerNum)
  let wordIndex = data_keys.indexOf(word);
  console.log(wordIndex);
  // words = document.querySelectorAll("text");
  // words.forEach(function(d){d.classList.replace("newEmbeddingText", "embeddingText")})
  if(playerNum > 0){
    document.getElementById('newEmbeddingText').removeAttribute("id");
  }
  let plotScores = document.querySelectorAll(".plotScore");
  if(plotScores.length > 0){
    plotScores.forEach(function(d){d.remove();})
  }

  // let wordIndex = data.indexOf(Array.prototype.slice.call(word2vec.model[word].dataSync()));
  await tsneCoordinates.then(function(result) {
    console.log(result[wordIndex]);
    let xCoord = scale(result[wordIndex][0], 0, 1, 0, 1200);
    let yCoord = scale(result[wordIndex][1], 0, 1, 0, 800);
    console.log(xCoord)
    console.log(yCoord)

    plotSVG.append("text")
      .text(word)
      .attr("x", xCoord + 6)
      .attr("y", yCoord + 3)
      .attr("id", "newEmbeddingText")
      .attr("class", "player" + playerNum + "text");
    plotSVG.append("circle")
      .attr("cx", xCoord)
      .attr("cy", yCoord)
      .attr("r", 3)
      .attr("fill", "silver")
      .attr("class", "player" + playerNum + "text");

    if(prev_xCoord !== 0 && prev_yCoord !== 0){
      // let points;
      // let scoreColor;

      // if(newScore >= 0){
      //   points = "+" + score;
      //   scoreColor = "blue";
      // }
      // else{
      //   points = score;
      //   scoreColor = "red";
      // }
      plotSVG.append("text")
        .text("+" + score + " distance")
        .attr("x", xCoord + 5)
        .attr("y", yCoord + 30)
        .attr("fill", "blue")
        .attr("class", "plotScore");
      plotSVG.append("text")
        .text("-" + timePenalty + " time")
        .attr("x", xCoord + 5)
        .attr("y", yCoord + 52)
        .attr("fill", "red")
        .attr("class", "plotScore");

      plotSVG.append("line")
        .attr("x1", prev_xCoord)
        .attr("y1", prev_yCoord)
        .attr("x2", xCoord)
        .attr("y2", yCoord)
        .attr("class", "player" + playerNum + "line")
        .attr("stroke", "silver")
        .attr("stroke-width", 1.5)
        .attr("opacity", 0.3)
        .attr("stroke-dasharray", 3);
    }

    prev_xCoord = xCoord;
    prev_yCoord = yCoord;
  });
}

function distance(a, b) {
  let result = tf.util.distSquared(word2vec.model[a].dataSync(), word2vec.model[b].dataSync());
  return result;
}

function gameOver(){
  clearInterval(counter);
  document.getElementById('countDown').textContent = "Game Over";
  if(playerOneScore>playerTwoScore){
    document.getElementById('player').textContent = "Player 1 Wins!";
    document.getElementById('player').style.color = "fuchsia";
    body.style.border = "25px solid fuchsia";

  }
  else if (playerTwoScore>playerOneScore){
    document.getElementById('player').textContent = "Player 2 Wins!";
    document.getElementById('player').style.color = "springgreen";
    body.style.border = "25px solid springgreen";
  }
  else if (playerOneScore==playerTwoScore){
    document.getElementById('player').textContent = "Draw!"
    body.style.border = "25px solid black";
  }
  // document.querySelector('#start-button > button').disabled = false;
  // document.querySelector('#start-button > button').style.display = "block";
  // document.querySelector('#start-button > button').textContent = "Restart Game";
  document.getElementById('restart-button').style.display= "inline-block";

}


function highScore(playerNum, totalScore, totalPoints, totalTimePenalty){

  document.getElementById("hiScore").style.display = "block";

  let time = Date.now();
  let key = "/scores/" + time;
  let newGameEntry = {};

  newGameEntry["time"] = Date.now();
  newGameEntry["playerName"] = Date.now();
  newGameEntry["totalScore"] = totalScore;
  newGameEntry["totalPoints"] = totalPoints;
  newGameEntry["totalTimePenalty"] = totalTimePenalty;

  database.ref(key).set(newobject);

}
