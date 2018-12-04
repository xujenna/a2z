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
  // var config = {
  //   apiKey: "AIzaSyAGKvWESjIqkNOXic9P-SCCrcFjFn3tmKM",
  //   authDomain: "word2vecgame.firebaseapp.com",
  //   databaseURL: "https://word2vecgame.firebaseio.com",
  //   projectId: "word2vecgame",
  //   storageBucket: "word2vecgame.appspot.com",
  //   messagingSenderId: "254456730638"
  // };
  // firebase.initializeApp(config);


// var database = firebase.database();
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
// let body = document.querySelector("body");
let tryAgain = false;
let turnBar = document.getElementById('turnBar');
let statCards = document.querySelectorAll('.playerStats');


let plotSVG = d3.select("#tsneSVG")
.append("svg:svg")
  .attr("width","90%")
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
  playerOnePoints = 0;
  playerOneTimePenalty = 0;
  playerTwoScore = 0;
  playerTwoPoints = 0;
  playerTwoTimePenalty = 0;
  // document.querySelector('#start-button > button').disabled = true;
  // let scores = document.querySelectorAll(".playerStats > h2");
  // scores.forEach(function(d){d.textContent=0});

  statCards.forEach(function(d){
    d.style.display = "none";
  })

  document.getElementById('restart-button').style.display= "none";
  document.querySelector('#start-button > button').style.display = "none";
  document.getElementById('rules').style.display= "none";
  turnBar.style.display = "block";

  plotSVG.remove();
  plotSVG = d3.select("#tsneSVG")
  .append("svg:svg")
    .attr("width",1300)
    .attr("height",800);
  document.getElementById('countDown').style.display = "inline-block";

  // document.querySelector('#tsneCanvas').style.display = "block";

  // let starter = randomProperty(word2vec.model)
  let starter = data_keys[data_keys.length * Math.random() << 0]

  // document.getElementById('currentWord').textContent = starter;
  getCoordinates(starter,0,0,playerNum);
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
      turnBar.style.backgroundColor = "orangered";
    }
    else{
      playerNum = 2;
      turnBar.style.backgroundColor = "dodgerblue";
    }
  }
  console.log("newTurn PlayerNum: "+ playerNum)

  document.getElementById('player').textContent = "Player " + playerNum;

  let count = 0;
  counter = setInterval(function() {
    count += 1;
    document.getElementById('countDown').textContent = "00:0" + (7-count);
    if(count >= 6){
      recognition.stop();

      if(playerNum == 1){
        speak("Time's up! Player 2 Wins!")
        gameOver(2);
      }
      else if(playerNum ==2){
        speak("Time's up! Player 1 Wins!")
        gameOver(1);
      }
    }
  }, 1000);

  const recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.start();

  recognition.onresult = event => {
    document.getElementById('tryAgain').textContent = "";

    let timePenalty = Math.pow(count, 3) * 10;
    console.log("time penalty: " + timePenalty)
    clearInterval(counter);

    let newWord = event.results[0][0].transcript;
    newWord = newWord.toLowerCase();
    console.log(word)
    console.log(newWord)
    // console.log(newWord)
    // document.getElementById('currentWord').textContent = newWord;

    try {
      // document.getElementById('newEmbeddingText').removeAttribute("id");

      let score = Math.round(Math.pow(distance(word, newWord),4) * 100);
      let newScore = score - timePenalty;
      console.log("score: " + score)
      console.log("newScore: " + newScore)
      console.log("timePenalty: " + timePenalty)

      // document.getElementById('lastRoundScore').textContent = newScore;
      // document.getElementById('lastRoundPoints').textContent = newScore + timePenalty;
      // document.getElementById('lastRoundTimePenalty').textContent = timePenalty;
      getCoordinates(newWord, score, timePenalty, playerNum);

      if(playerNum == 1){
        playerOneScore += newScore;
        playerOnePoints += score;
        playerOneTimePenalty += timePenalty;

        if(playerOneScore >= 9000){
          recognition.stop();
          gameOver(playerNum);
        }
        else if(playerOneScore > 0){
          document.getElementById('playerOneBar').style.height = (playerOneScore/10) + "px";
        }
        else if(playerOneScore <= 0){
          document.getElementById('playerOneBar').style.height = "0px";
        }

        // document.getElementById('playerOneScore').textContent = playerOneScore;
        // document.getElementById('playerOnePoints').textContent = playerOnePoints;
        // document.getElementById('playerOneTimePenalty').textContent = playerOneTimePenalty;
      }
      else if(playerNum == 2){
        playerTwoScore += newScore;
        playerTwoPoints += score;
        playerTwoTimePenalty += timePenalty;
        
        if(playerTwoScore >= 9000){
          recognition.stop();
          gameOver(playerNum);
        }
        else if(playerTwoScore > 0){
          document.getElementById('playerTwoBar').style.height = (playerTwoScore/10) + "px";
        }
        else if(playerTwoScore <= 0){
          document.getElementById('playerTwoBar').style.height = "0px";
        }
        // document.getElementById('playerTwoScore').textContent = playerTwoScore;
        // document.getElementById('playerTwoPoints').textContent = playerTwoPoints;
        // document.getElementById('playerTwoTimePenalty').textContent = playerTwoTimePenalty;
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
  let wordIndex = data_keys.indexOf(word);
  console.log(wordIndex);
  // words = document.querySelectorAll("text");
  // words.forEach(function(d){d.classList.replace("newEmbeddingText", "embeddingText")})
  if(playerNum > 0){
    let prevEmbedding = document.getElementById('newEmbeddingText');
    prevEmbedding.removeAttribute("id");
    prevEmbedding.classList.add("embeddingText");
  }
  let plotScores = document.querySelectorAll(".plotScore");
  if(plotScores.length > 0){
    plotScores.forEach(function(d){d.remove();})
  }

  // let wordIndex = data.indexOf(Array.prototype.slice.call(word2vec.model[word].dataSync()));
  await tsneCoordinates.then(function(result) {
    console.log(result[wordIndex]);
    let xCoord = scale(result[wordIndex][0], 0, 1, 0, (window.innerWidth * 0.90));
    let yCoord = scale(result[wordIndex][1], 0, 1, 0, (window.innerHeight * 0.98));
    console.log(xCoord)
    console.log(yCoord)


    plotSVG.append("text")
      .text(word)
      .attr("x", xCoord + 10)
      .attr("y", yCoord + 5)
      .attr("id", "newEmbeddingText")
      .attr("class", "player" + playerNum + "text");
    plotSVG.append("circle")
      .attr("cx", xCoord)
      .attr("cy", yCoord)
      .attr("r", 5)
      .attr("fill", "silver")
      .attr("class", "player" + playerNum + "text");

    if(prev_xCoord !== 0 && prev_yCoord !== 0){
      // let points;
      // let scoreColor;

      // if(newScore >= 0){
      //   points = "+" + score;
      //   scoreColor = "aqua";
      // }
      // else{
      //   points = score;
      //   scoreColor = "magenta";
      // }
      plotSVG.append("text")
        .text("+" + score + " distance")
        .attr("x", xCoord + 5)
        .attr("y", yCoord + 30)
        .attr("fill", "aqua")
        .attr("class", "plotScore");
      plotSVG.append("text")
        .text("-" + timePenalty + " time")
        .attr("x", xCoord + 5)
        .attr("y", yCoord + 52)
        .attr("fill", "magenta")
        .attr("class", "plotScore");

      plotSVG.append("line")
        .attr("x1", prev_xCoord)
        .attr("y1", prev_yCoord)
        .attr("x2", xCoord)
        .attr("y2", yCoord)
        .attr("class", "player" + playerNum + "line")
        .attr("stroke", "silver")
        .attr("stroke-width", 3)
        .attr("opacity", 0.6)
        .attr("stroke-dasharray", 3);
    }
    prev_xCoord = xCoord;
    prev_yCoord = yCoord;
  });
}

function distance(a, b) {
  console.log("distance a: " + a)
  console.log("distance b; " + b)
  let result = tf.util.distSquared(word2vec.model[a].dataSync(), word2vec.model[b].dataSync());
  console.log("distance result: " + result)
  return result;
}

function gameOver(playerNum){
  clearInterval(counter);

  document.getElementById('countDown').style.display = "none";
  // document.getElementById('player').textContent = "Player " + playerNum + " Wins!";

  statCards.forEach(function(d){
    d.style.display = "inline-block";
  })
  document.getElementById('playerOneScore').textContent = playerOneScore;
  document.getElementById('playerOnePoints').textContent = playerOnePoints;
  document.getElementById('playerOneTimePenalty').textContent = playerOneTimePenalty;
  document.getElementById('playerTwoScore').textContent = playerTwoScore;
  document.getElementById('playerTwoPoints').textContent = playerTwoPoints;
  document.getElementById('playerTwoTimePenalty').textContent = playerTwoTimePenalty;

  speak("Player " + playerNum + " Wins!")

  if(playerNum == 1){
    // document.getElementById('player').style.color = "orangered";
    turnBar.style.backgroundColor = "orangered";
  }
  else{
    // document.getElementById('player').style.color = "dodgerblue";
    turnBar.style.backgroundColor = "dodgerblue";
  }
  // if(playerOneScore>playerTwoScore){
  //   speak("Player one wins!");
  //   document.getElementById('player').textContent = "Player 1 Wins!";
  //   document.getElementById('player').style.color = "orangered";
  //   body.style.border = "25px solid orangered";

  // }
  // else if (playerTwoScore>playerOneScore){
  //   speak("Player two wins!");
  //   document.getElementById('player').textContent = "Player 2 Wins!";
  //   document.getElementById('player').style.color = "dodgerblue";
  //   body.style.border = "25px solid dodgerblue";
  // }
  // else if (playerOneScore==playerTwoScore){
  //   speak("It's a tie!");
  //   document.getElementById('player').textContent = "Draw!"
  //   body.style.border = "25px solid black";
  // }
  // document.querySelector('#start-button > button').disabled = false;
  // document.querySelector('#start-button > button').style.display = "block";
  // document.querySelector('#start-button > button').textContent = "Restart Game";
  document.getElementById('restart-button').style.display= "block";

}


// function highScore(playerNum, totalScore, totalPoints, totalTimePenalty){

//   document.getElementById("hiScore").style.display = "block";

//   let time = Date.now();
//   let key = "/scores/" + time;
//   let newGameEntry = {};

//   newGameEntry["time"] = Date.now();
//   newGameEntry["playerName"] = Date.now();
//   newGameEntry["totalScore"] = totalScore;
//   newGameEntry["totalPoints"] = totalPoints;
//   newGameEntry["totalTimePenalty"] = totalTimePenalty;

//   database.ref(key).set(newobject);

// }
