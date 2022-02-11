const board = document.querySelector('.board');
const selectionDiv = document.querySelector('.selection');

let localStorageMemos = JSON.parse(localStorage.getItem('memos')) || [];

let memoList = [];

//tracking variable

let mouseClicked = false;
let movingMemo = false;
let resizingMemo = false;

//mouse coordinate variables

let offsetXStart = 0;
let offsetYStart = 0;
let offsetXEnd = 0;
let offsetYEnd = 0;

//current offsets used to style selection div

let offsetXCurrent = 0;
let offsetYCurrent = 0;

//Board event listeners

board.addEventListener('mousedown', (e) => {

    mouseClicked = true;

    // set starting mouse coordinates
    offsetXStart = e.offsetX;
    offsetYStart = e.offsetY;

    // if another memo is not currently being moved around.
    if (!movingMemo) {
        selectionDiv.style.top = `${offsetYStart}px`;
        selectionDiv.style.left = `${offsetXStart}px`;
        selectionDiv.style.display = 'block';
        board.style.cursor = 'crosshair'
    }
});

board.addEventListener('mouseup', (e) => {

    mouseClicked = false;
    offsetXEnd = e.offsetX;
    offsetYEnd = e.offsetY;

    let width = offsetXEnd - offsetXStart;
    let height = offsetYEnd - offsetYStart

    if (width >= 50 && height >= 50 && !movingMemo && !resizingMemo) {
        //create new memo

        let memo = new Memo(
            Date.now(),
            { left: offsetXStart, top: offsetYStart },
            { width, height },
            '' //no content on init
        )
        memoList.push(memo);
        updateLocalStorage();
    }

    // Hide the selection area div and change cursor back
    selectionDiv.style.width = '0px';
    selectionDiv.style.height = '0px';
    selectionDiv.style.display = 'none';
    board.style.cursor = 'default';
});

board.addEventListener('mousemove', (e) => {
    if (mouseClicked && !movingMemo && !resizingMemo) {
        offsetXCurrent = e.offsetX - offsetXStart;
        offsetYCurrent = e.offsetY - offsetYStart;

        selectionDiv.style.width = `${offsetXCurrent}px`;
        selectionDiv.style.height = `${offsetYCurrent}px`;
    }
});

class Memo {
    constructor(id, position, size, content) {
        this.id = id;
        this.position = position;
        this.size = size;
        this.content = content;
        this.moving = false;
        this.resizing = false;
        this.createMemo();
    }

    createMemo() {
        this.div = document.createElement('div');
        this.div.classList.add('memo');

        this.div.style.top = `${this.position.top}px`;
        this.div.style.left = `${this.position.left}px`;
        this.div.style.height = `${this.size.height}px`;
        this.div.style.width = `${this.size.width}px`;

        this.move = document.createElement('div');
        this.move.classList.add('move');
        this.move.addEventListener('mousedown', this.mouseDownMove.bind(this));
        window.addEventListener('mouseup', this.mouseUp.bind(this))
        this.div.appendChild(this.move);

        this.close = document.createElement('div');
        this.close.classList.add('close');
        this.move.appendChild(this.close);
        this.close.addEventListener('click', this.deleteMemo.bind(this));

        this.text = document.createElement('textarea');
        this.text.classList.add('text');
        this.text.value = this.content;
        this.text.addEventListener('keyup', this.updateText.bind(this));
        this.text.addEventListener('blur', updateLocalStorage);
        this.div.appendChild(this.text);

        this.resize = document.createElement('div');
        this.resize.classList.add('resize');
        this.resize.addEventListener('mousedown', this.mouseDownResize.bind(this));
        this.div.appendChild(this.resize);

        board.appendChild(this.div);
    }

    mouseDownMove(e) {
        movingMemo = true;

        this.moving = true;

        this.move.style.cursor = 'grabbing';
        this.move.style.backgroundColor = '#bbf70655';

        // determine where the grab cursor is to position the memo relative the the offset and mouse position.
        this.movingXDist = e.clientX - this.position.left;
        this.movingYDist = e.clientY - this.position.top;
    }

    moveMemo(e) {
        // Move memo subtracting moving distances to account for mouse offset position within the move div.
        this.div.style.left = `${e.clientX - this.movingXDist}px`;
        this.div.style.top = `${e.clientY - this.movingYDist}px`;
    }

    mouseDownResize(e) {
        this.resizing = true;
        resizingMemo = true;
    }

    resizeMemo(e) {
        let height = e.clientY - this.position.top;
        let width = e.clientX - this.position.left;

        //limit the size to a minimum of 50px x 50px

        if (width >= 50 && height >= 50) {
            // Set sizes for future re-renders
            this.size.height = height;
            this.size.width = width;

            // Change the style to match dimensions
            this.div.style.height = `${height}px`;
            this.div.style.width = `${width}px`;
        }
        updateLocalStorage();
    }

    mouseUp() {
        const currentPosition = { left: this.position.left, top: this.position.top };
        Object.freeze(currentPosition);

        const currentSize = { width: this.size.width, height: this.size.height };
        Object.freeze(currentSize);

        movingMemo = false;
        resizingMemo = false;

        this.moving = false;
        this.resizing = false;

        this.move.style.cursor = 'grab';
        this.move.style.backgroundColor = 'transparent';

        //getting new position of memo after the movement
        this.position.top = this.div.offsetTop;
        this.position.left = this.div.offsetLeft;

        //Adjust the memo position if dragged out of board bounds

        if (this.position.top < 0) {
            this.position.top = 0;
            this.div.style.top = 0;
        }

        let boardHeight = board.getBoundingClientRect().bottom;

        if (this.position.top + this.size.height > boardHeight) {
            this.position.top = boardHeight - (this.size.height + 10);
            this.div.style.top = `${this.position.top}px`;
        }

        if (this.position.left < 0) {
            this.position.left = 0;
            this.div.style.left = '0px';
        }

        let boardRight = board.getBoundingClientRect().right;

        if (this.position.left + this.size.width > boardRight) {
            this.position.left = boardRight - (this.size.width + 10);
            this.div.style.left = `${this.position.left}px`;
        }

        if (JSON.stringify(this.position) != JSON.stringify(currentPosition) || JSON.stringify(this.size) != JSON.stringify(currentSize)) {
            updateLocalStorage()
        }
    }

    updateText() {
        this.content = this.text.value;
    }

    deleteMemo() {

        memoList = memoList.filter(memo => {
            return memo.id != this.id;
        })
        updateLocalStorage();
        this.div.remove();
    }
}

// Initialize stored memos on page load
localStorageMemos.forEach(memo => {
    let storedMemo = new Memo(
        memo.id,
        { left: memo.position.left, top: memo.position.top },
        { width: memo.size.width, height: memo.size.height },
        memo.content
    );
    memoList.push(storedMemo);
})

// Function used to update local storage if any differences are identified
function updateLocalStorage() {
    if (localStorage.getItem('memos') != JSON.stringify(memoList)) {
        localStorage.setItem('memos', JSON.stringify(memoList));
        console.log('LS updated');
    }
}

//Global event listeners

/*listening to mouse movements to detect whether a memo's moving or resizing variable is true
and if true calling the moveMemo() resizeMemo() on that memo in order to resize or move*/
window.addEventListener('mousemove', (e) => {
    for (let i = 0; i < memoList.length; i++) {
        if (memoList[i].moving) {
            memoList[i].moveMemo(e);
        }

        if (memoList[i].resizing) {
            memoList[i].resizeMemo(e);
        }
    }
})

window.addEventListener('mouseup', () => {
    for (let i = 0; i < memoList.length; i++) {
        memoList[i].mouseUp();
    }
})

// new Memo(Date.now(), { top: 100, left: 10 }, { width: 100, height: 100 }, "hello world")

//modal handling


const overlay = document.querySelector('.overlay');
document.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'h') {
        overlay.classList.add('hide');
    }
});