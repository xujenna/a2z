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
playerOneScore = 0;



const speak = (textInput) => {
  if(synth.speaking){
    console.error('already speaking')
    return;
  }
  let utterThis = new SpeechSynthesisUtterance(textInput)
  synth.speak(utterThis)
}


function modelLoaded() {
  document.getElementById('start-button').innerHTML= "<button onclick='start();'>Start Game</button>";
}

// var randomProperty = function (obj) {
function randomProperty(obj) {
  var keys = Object.keys(obj)

  return keys[ keys.length * Math.random() << 0];
};

async function start() {
  document.querySelector('#start-button > button').disabled = true;
  playerOneScore = 0;

  let starter = await randomProperty(word2vec.model)
  

  document.getElementById('currentWord').textContent = starter;

  speak(starter);
  newTurn(starter);
}


function newTurn(word) {
  let count = 0;
  let counter = setInterval(function() {
    count += 1;
    document.getElementById('countDown').textContent = 7-count;
    if(count >= 7){
      clearInterval(counter);
      document.getElementById('countDown').textContent = "Game Over";
      document.querySelector('#start-button > button').disabled = false;
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
    console.log(newWord)
    document.getElementById('currentWord').textContent = newWord;

    let newScore = Math.round(Math.pow((distance(word, newWord)*10),3)) - timePenalty;
    console.log(newScore)
    document.getElementById('lastRoundScore').textContent = newScore + timePenalty;
    document.getElementById('lastRoundTimePenalty').textContent = timePenalty;

    playerOneScore += newScore;
    document.getElementById('playerOneScore').textContent = playerOneScore;

    newTurn(newWord)
  }

  recognition.onend = () => {
		console.log("ended recording");
		recognition.stop();
  }
  
  recognition.onerror = event => {
		console.log("error: " + event.error);
  }
}

function getCoordinates(word) {
  // console.log(word2vec.model[word])
  let tsneOpt = tsne.tsne(word2vec.model[word]);
  // tsneOpt.coordsArray().then(result=>{
  //   console.log("hellow");
  //   console.log(result)
  //   map(result)
  // })
  tsneOpt.compute().then(() => {
    const coordinates = tsneOpt.coordinates();
    coordinates.print();
    // let coordinates = tsneOpt.coordsArray().then(result=>{
    //     console.log("hellow");
    //     console.log(result)
    //     map(result)
    //   })
  })
}

function distance(a, b) {
  let result = tf.util.distSquared(word2vec.model[a].dataSync(), word2vec.model[b].dataSync())
  return result;
}

