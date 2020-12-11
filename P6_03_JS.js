'use strict';

let playerInGameTurn = 1;
const playersInGame = 2;

const nextPlayerTurn = () => {
  if (playerInGameTurn === playersInGame) {
    return 1;
  }

  return playerInGameTurn + 1;
};

const gameOverModal = $('#gameOverModal');
const gameOverMessageElement = $('#gameOverMessage');
const turnElement = $('#turn');
const gameElement = $('#game');
const playerModeSelectModal = $('#playerModeSelectModal');
const playerModeSelectModalForm = document.getElementById('playerModeSelectModalForm');

const playersLifePointsElements = [$('#player1LifePoints'), $('#player2LifePoints')];
const playersWeaponElements = [$('#player1Weapon'), $('#player2Weapon')];
const playersModes = [$('#player1Mode'), $('#player2Mode')];

// 1 to max inclusive
const getRandomInt = (max) => {
  return 1 + Math.floor(Math.random() * Math.floor(max));
};

//Warning: This function modifies the array
const shuffleArray = (array) => {
  let currentIndex = array.length;
  let temporaryValue;
  let randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

const Board = (() => {
  //private variables and functions
  let cells = [];
  let lastAvailablePositions = [];
  const numberOfRows = 10;
  const numberOfCols = 10;

  const isPositionFreeForMovement = (position) => {
    if (position[0] >= numberOfRows || position[0] < 0) {
      return false;
    }

    if (position[1] >= numberOfCols || position[1] < 0) {
      return false;
    }

    if (!cells[position[0]][position[1]].isAvailable()) {
      return false;
    }

    if (gameState.isPlayerHere(position)) {
      return false;
    }


    return true;

    //colPosition >= numberOfCols || !cells[rowPosition][colPosition].isAvailable() || gameState.isPlayerOrWeaponHere([rowPosition, colPosition])
  }

  //get positions a player current at the passed position can move to
  const getValidDestinationsFromPosition = (position) => {
    const getPositions = (direction) => {
      const positions = [];
      let rowPosition = position[0];
      let colPosition = position[1];
      let stepFunction;

      switch (direction) {
        case 0:
          stepFunction = () => colPosition -= 1;
          break;
        case 1:
          stepFunction = () => colPosition += 1;
          break;
        case 2:
          stepFunction = () => rowPosition -= 1;
          break;
        case 3:
          stepFunction = () => rowPosition += 1;
          break;
        default:
          throw Error('');
      }

      for (let i = 0; i < Player.maxMove; i += 1) {
        stepFunction();

        if (!isPositionFreeForMovement([rowPosition, colPosition])) {
          break;
        }

        positions.push([rowPosition, colPosition]);
      }

      return positions;
    };

    return [...getPositions(0), ...getPositions(1), ...getPositions(2), ...getPositions(3)];
  };

  //get all positions that arent dimmed
  const getAvailablePositions = () => {
    const availablePositions = [];

    cells.forEach(
      (row, rowIndex) =>
      row.forEach(
        (cell, colIndex) => {
          if (cell.isAvailable()) {
            availablePositions.push([rowIndex, colIndex]);
          }
        }
      )
    );

    shuffleArray(availablePositions);

    lastAvailablePositions = availablePositions;

    return availablePositions;
  };

  //for caching so we wont keep iteration when there was no change since the last time
  //we got availablePositions
  const getLastAvailablePositions = () => {
    if (!lastAvailablePositions) {
      return lastAvailablePositions;
    }

    return getAvailablePositions();
  };

  const getPath = (fromPosition, toPosition) => {
    const path = [];
    let direction; //0 - horizontal, 1 - vertical
    let adjacent;
    let increment;

    if (fromPosition[0] === toPosition[0]) {
      direction = 0;
      adjacent = 1;
    } else if (fromPosition[1] === toPosition[1]) {
      direction = 1;
      adjacent = 0;
    } else {
      throw Error('');
    }

    if (fromPosition[adjacent] > toPosition[adjacent]) {
      increment = -1;
    } else {
      increment = 1;
    }

    for (let i = 0, newPointFeature = fromPosition[adjacent]; i < Player.maxMove; i += 1) {
      const point = [null, null];

      newPointFeature += increment;

      point[direction] = fromPosition[direction];
      point[adjacent] = newPointFeature;

      path.push(point);

      if (newPointFeature === toPosition[adjacent]) {
        break;
      }
    }

    return path;
  };

  //make cellsmap((row, rowIndex)=>row)
  const makeCells = () => {
    for (let i0 = 0; i0 < numberOfRows; i0 += 1) {
      cells.push([]);
      //cols
      for (let i1 = 0; i1 < numberOfCols; i1 += 1) {
        //cells[i0].push(new Cell(!!Math.round(Math.random())));
        cells[i0].push(new Cell(true));
      }
    }

    for (let i1 = 0; i1 < 6; i1 += 1) {
      const row = getRandomInt(10) - 1;
      const col = getRandomInt(10) - 1;

      cells[row][col] = null;
      cells[row][col] = new Cell(false);
    }
  };

  const reset = () => {
    cells = [];

    makeCells();
  };

  const getAllCells = () => cells;

  //public vars and fns
  return {
    initialize: makeCells,
    reset,
    getPath,
    getValidDestinationsFromPosition,
    getAvailablePositions,
    getLastAvailablePositions,
    getAllCells
  }
})();

class Cell {
  constructor(isAvailable) {
    this.available = isAvailable;
  }

  isAvailable() {
    return this.available;
  }
}

//Things that are on the board
class Things {
  constructor(position, visual) {
    this.position = position; //[row, col]
    this.visual = visual || '🙂';
    this.hidden = false;
  }

  isHidden() {
    return this.hidden;
  }

  isShown() {
    return !this.hidden;
  }

  setPosition(position) {
    this.position = position;
  }

  getPosition() {
    return this.position;
  }

  getVisual() {
    return this.visual;
  }
}

class Player extends Things {
  static maxMove = 3;

  constructor(position, type, playerNum) {
    super(position);

    switch (type) {
      case 1:
        this.visual = '🧑🏿‍';
        break;
      case 2:
        this.visual = '🧑‍';
        break;
      default:
        throw Error('');
    }

    this.playerNum = playerNum;
    this.lifePoints = 100;
    this._isDefending;
  }

  setDefending() {
    this._isDefending = true;
  }

  setAttacking() {
    this._isDefending = false;
  }

  isDefending() {
    return this._isDefending;
  }

  isAttacking() {
    return !this._isDefending;
  }

  reduceLifePoints(byNumber) {
    if (this._isDefending) {
      this.lifePoints -= Math.floor(byNumber / 2);
    } else {
      this.lifePoints -= byNumber;
    }

    if (this.lifePoints < 0) {
      this.lifePoints = 0;
    }
  }

  getLifePoints() {
    return this.lifePoints;
  }

  getPlayerNum() {
    return this.playerNum;
  }

  setPosition(position) {
    let weapon;

    for (const point of Board.getPath(this.position, position)) {
      if (weapon = gameState.getWeaponHere(point)) {
        break;
      }
    }

    //should update position cos we'd use position in the _pickWeapon function
    super.setPosition(position);

    if (weapon) {
      this._pickWeapon(weapon);
    }
  }

  getWeapon() {
    return this.weapon;
  }

  useWeapon() {
    const weapon = this.weapon;

    this.weapon = null;

    return weapon;
  }

  hasWeapon() {
    return !!this.weapon;
  }

  _pickWeapon(weapon) {
    if (this.weapon) {
      this.weapon.setPosition(this.position);
      this.weapon.drop();

      this.weapon = null;
    }

    weapon.pick();

    this.weapon = weapon;

    gameState.onPickedWeapon(this);
  }
}

class Weapon extends Things {
  constructor(position, type) {
    super(position);

    switch (type) {
      case 1:
        this.name = 'shakabula';
        this.points = 30;
        this.visual = '💣';
        break;
      case 2:
        this.name = 'baginatu';
        this.points = 20;
        this.visual = '🔫';
        break;
      default:
        this.name = 'catapult';
        this.points = 10;
        this.visual = '🗡️';
        break;
    }
  }


  pick() {
    this.hidden = true;
  }

  drop() {
    this.hidden = false;
  }
}

const gameState = (() => {
  let isFightMode = false;
  const board = Board;
  const players = [];
  const weapons = [];

  const ensureThereAreWeapons = () => weapons.some((weapon) => weapon.isShown()) || makeWeapons();

  const findThing = (things, position) => things.find(
    (thing) => {
      if (thing.isHidden()) {
        return false;
      }

      const thingPosition = thing.getPosition();

      return thingPosition[0] === position[0] && thingPosition[1] === position[1];
    }
  );

  const getPlayerOrWeaponHere = (position) => findThing([...players, ...weapons], position);

  const getWeaponHere = (position) => findThing(weapons, position);

  const isThingHere = (things, position) => things.some(
    (thing) => {
      if (thing.isHidden()) {
        return false;
      }

      const thingPosition = thing.getPosition();

      return thingPosition[0] === position[0] && thingPosition[1] === position[1];
    }
  );

  const isPlayerOrWeaponHere = (position) => isThingHere([...players, ...weapons], position);

  const isPlayerHere = (position) => isThingHere(players, position);

  const generateRandomPosition = () => board
    .getLastAvailablePositions()
    .find((position) => !isPlayerOrWeaponHere(position));

  const initialize = () => {
    //init board, players, weapons
    board.initialize();

    makePlayers();
    makeWeapons();
  };

  const renderUI = () => {
    let html = '<table>';

    board.getAllCells().forEach(
      (row, rowIndex) => {
        html += '<tr>'

        row.forEach(
          (cell, colIndex) => {
            if (cell.isAvailable()) {
              //check if there a weapon or player here
              html += '<td class="bg-light" data-row="' + rowIndex + '" data-col="' + colIndex;

              const position = [rowIndex, colIndex];
              let thingHere;

              if ((thingHere = getPlayerOrWeaponHere(position)) && thingHere.isShown()) {
                if (thingHere instanceof Player) {
                  html += '" data-isPlayer=""';
                } else {
                  html += '"';
                }

                html += '>';

                html += thingHere.getVisual();
              } else {
                html += '">';
              }

              html += '</td>';
            } else {
              html += '<td class="bg-secondary"></td>';
            }
          }
        );

        html += '</tr>'
      });

    html += '</table>';

    gameElement.html(html);

    gameElement.find('td[data-isPlayer]').on('mouseover', (event) => {
      const $this = $(event.target);
      const position = [+$this.attr('data-row'), +$this.attr('data-col')];

      board.getValidDestinationsFromPosition(position)
        .forEach(
          (destPosition) => gameElement.find('td[data-row="' + destPosition[0] + '"][data-col="' + destPosition[1] + '"]').addClass('highligted')
        );
    }).on('mouseout', () => {
      gameElement.find('.highligted').removeClass('highligted');
    });
  };

  const onPickedWeapon = (player) => {
    playersWeaponElements[player.getPlayerNum() - 1].text(player.getWeapon().getVisual());

    ensureThereAreWeapons();
  };

  const checkAttack = (destPosition) => {
    let currentPlayer;
    let otherPlayer;
    let otherPlayerPosition;

    switch (playerInGameTurn) {
      case 1:
        currentPlayer = players[0];
        otherPlayer = players[1];
        otherPlayerPosition = players[1].getPosition();
        break;
      case 2:
        currentPlayer = players[1];
        otherPlayer = players[0];
        otherPlayerPosition = players[0].getPosition();
        break;
    }

    if (destPosition[0] === otherPlayerPosition[0] && destPosition[1] === otherPlayerPosition[1]) {
      // check if you have a weapon, if so, attack the other player
      if (currentPlayer.isAttacking() && currentPlayer.hasWeapon()) {
        attack(currentPlayer, otherPlayer);

        return true;
      }
    }
  };

  const attack = (playerAttacking, playerBeingAttacked) => {
    const attackWeapon = playerAttacking.useWeapon();

    playerBeingAttacked.reduceLifePoints(attackWeapon.points);

    if (playerBeingAttacked.getLifePoints() === 0) {
      //game over
      //attacking player wins
      gameOverMessageElement.text(`Player ${playerAttacking.getPlayerNum()} wins`);
      gameOverModal.modal({
        backdrop: 'static',
        keyboard: false
      });
    }

    //update player life points and other players' weapon as empty
    playersLifePointsElements[playerBeingAttacked.getPlayerNum() - 1].text(playerBeingAttacked.getLifePoints());

    playersWeaponElements[playerAttacking.getPlayerNum() - 1].text('');
  };

  const offFight = () => {
    if (!isFightMode) {
      return;
    }

    isFightMode = false;
  };

  const onFight = () => {
    if (isFightMode) {
      return;
    }

    isFightMode = true;

    playerModeSelectModal.modal({
      backdrop: 'static',
      keyboard: false
    });
  };

  const isPlayersCrossOver = (player1Position, player2Position) => player1Position[0] === player2Position[0] || player1Position[1] === player2Position[1];

  const onTurn = (position) => {
    const nextAction = () => {
      gameState.renderUI();

      playerInGameTurn = nextPlayerTurn();

      turnElement.text(getPlayer(playerInGameTurn).getVisual());
    };

    if (isValidDestinationForPlayer(playerInGameTurn, position)) {
      const playerInTurn = getPlayer(playerInGameTurn);
      const nextPlayerInTurn = getPlayer(nextPlayerTurn());

      playerInTurn.setPosition(position);

      if (isPlayersCrossOver(playerInTurn.getPosition(), nextPlayerInTurn.getPosition())) {
        onFight();
      } else {
        offFight();
      }

      nextAction();
    } else if (checkAttack(position)) {
      nextAction();
    }
  };

  const isValidDestinationForPlayer = (playerNum, position) =>
    board
    .getValidDestinationsFromPosition(players[playerNum - 1].getPosition())
    .some((destPosition) => destPosition[0] === position[0] && destPosition[1] === position[1]);

  const getPlayer = (playerNum) => players[playerNum - 1];

  const updateUI = () => {

  };

  const makeWeapons = () => {
    for (let numWeapons = 0, weaponsCount = getRandomInt(4); numWeapons < weaponsCount; numWeapons += 1) {
      weapons.push(new Weapon(generateRandomPosition(), getRandomInt(3)));
    }
  };

  const makePlayers = () => {
    for (let numPlayers = 0, playersCount = playersInGame; numPlayers < playersCount; numPlayers += 1) {
      players.push(new Player(generateRandomPosition(), numPlayers + 1, numPlayers + 1));
    }
    // players.push(
    //   new Player(generateRandomPosition(), 1),
    //   new Player(generateRandomPosition(), 2)
    // );
  };

  return {
    onTurn,
    getPlayer,
    onPickedWeapon,
    getWeaponHere,
    isPlayerHere,
    isPlayerOrWeaponHere,
    initialize,
    renderUI,
    updateUI
  }
})();

gameState.initialize();
gameState.renderUI();

$('#playerModeSelectModalContinueBtn').on('click', () => {
  if (playerModeSelectModalForm.player1Mode.value && playerModeSelectModalForm.player2Mode.value) {
    if (!!+playerModeSelectModalForm.player1Mode.value) {
      gameState.getPlayer(1).setAttacking();
      playersModes[0].text('Att');
    } else {
      gameState.getPlayer(1).setDefending();
      playersModes[0].text('Def');
    }

    if (!!+playerModeSelectModalForm.player2Mode.value) {
      gameState.getPlayer(2).setAttacking();
      playersModes[1].text('Att');
    } else {
      gameState.getPlayer(2).setDefending();
      playersModes[1].text('Def');
    }

    playerModeSelectModal.modal('hide');
  }
});

$("#game").on("click", "td[data-row][data-col]", (event) => {
  const $this = $(event.target);
  const position = [+$this.attr('data-row'), +$this.attr('data-col')];

  gameState.onTurn(position);
});

turnElement.text(gameState.getPlayer(playerInGameTurn).getVisual());
playersLifePointsElements.forEach((element, index) => element.text(gameState.getPlayer(index + 1).getLifePoints()));