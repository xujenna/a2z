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

const speak = (textInput) => {
  if(synth.speaking){
    console.error('already speaking')
    return;
  }
  let utterThis = new SpeechSynthesisUtterance(textInput)
  synth.speak(utterThis)
}

playerOneScore = 0;

function modelLoaded() {
  document.getElementById('status').innerHTML='Model Loaded';
  start();
}

// var randomProperty = function (obj) {
function randomProperty(obj) {
  console.log("starter word")
  var keys = Object.keys(obj)

  return keys[ keys.length * Math.random() << 0];
};

async function start() {
  console.log("start")
  playerOneScore = 0;

  // let starter = randomProperty(word2vec.model);

  // speak(starter);
  // newTurn(starter);
  let starter = await randomProperty(word2vec.model)
  
  speak(starter);
  newTurn(starter);

  // getCoordinates(starter);
  // playerOneScore = 0;

  // newTurn(starter);
  // let a = document.getElementById('start').value;
  // let b = document.getElementById('end').value;

  
  // distance(a, b).then(result => {
  //   document.getElementById('between').innerHTML = 'distance: ' + result;
  // });
}


function getResponse() {
  console.log("get response")
  const recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.start();
  console.log('started rec');

  recognition.onresult = event => {
    let result = event.results[0][0].transcript;
    console.log(result)
    return result;
  }

  recognition.onend = () => {
		console.log("it is over");
		recognition.stop();
  }
  
  recognition.onerror = event => {
		console.log("something went wrong: " + event.error);
  }
}

function newTurn(word) {
  document.getElementById('currentWord').textContent = word;

  console.log("new turn")
  // playerOneScore = 0;
  // playerTwoScore = 0;
  // playerOneWord;
  // playerTwoWord;

// let newWord = await getResponse(word);
getResponse().then(function(result) {
  document.getElementById('currentWord').textContent = result;
  return distance(word, result);
  // let newWord = result;
})
.then(function(distance){
  let newScore = distance * 100;
  playerOneScore += newScore;
  document.getElementById('playerOneScore').textContent = playerOneScore;
})

// let newScore = await distance(word, newWord) * 100;
// playerOneScore += newScore;
// document.getElementById('playerOneScore').textContent = playerOneScore;

// newTurn(newWord)

}
 
  // document.getElementById('currentWord').textContent = newWord;
  // playerOneScore += distance * 100;
  // document.getElementById('playerOneScore').textContent = playerOneScore;
  // newTurn(newWord)



function getCoordinates(word) {
  // console.log(word2vec.model[word])
  let tsneOpt = tsne.tsne(word2vec.model[word]);
  // tsneOpt.coordsArray().then(result=>{
  //   console.log("hellow");
  //   console.log(result)
  //   map(result)
  // })

  
  tsneOpt.compute().then(() => {
    console.log("hello");
    const coordinates = tsneOpt.coordinates();
    coordinates.print();
    // let coordinates = tsneOpt.coordsArray().then(result=>{
    //     console.log("hellow");
    //     console.log(result)
    //     map(result)
    //   })
  })
}

function map(coordinates){
  console.log(coordinates)
  console.log("goodbye")
}


function distance(a, b) {
  console.log("distance")
  let result = tf.util.distSquared(word2vec.model[a].dataSync(), word2vec.model[b].dataSync())
  return result;
}
